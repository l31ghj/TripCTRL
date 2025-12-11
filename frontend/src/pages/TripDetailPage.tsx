import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getTrip,
  Trip,
  Segment,
  Attachment,
  SegmentDetails,
  TripShare,
  listTripShares,
  addTripShare,
  removeTripShare,
  getTripPlanning,
  saveTripPlanning,
} from '../api/trips';
import { createSegment, deleteSegment, updateSegment } from '../api/segments';
import { uploadTripImage } from '../api/upload';
import { api, buildImageUrl } from '../api/client';
import {
  uploadTripAttachment,
  uploadSegmentAttachment,
  deleteTripAttachment,
  deleteSegmentAttachment,
} from '../api/attachments';
import { NavBar } from '../components/NavBar';
import { getCurrentUser } from '../auth/token';

type TripDetail = Awaited<ReturnType<typeof getTrip>>;



type SegmentFormState = {
  id?: string;
  type: string;
  transportMode: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  provider: string;
  confirmationCode: string;
  flightNumber: string;
  seatNumber: string;
  passengerName: string;
  activityNotes: string;
};

type TripFormState = {
  title: string;
  mainLocation: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const emptyTripForm: TripFormState = {
  title: '',
  mainLocation: '',
  startDate: '',
  endDate: '',
  notes: '',
};

type ChecklistItem = { id: string; text: string; done: boolean };
type PlanningData = {
  packing: ChecklistItem[];
  ideas: ChecklistItem[];
  tasks: ChecklistItem[];
  notes: string;
};
type ParsedEmailSegment = {
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string;
  type?: string;
  raw: string;
};

const emptySegmentForm: SegmentFormState = {
  type: 'transport',
  transportMode: 'flight',
  title: '',
  startTime: '',
  endTime: '',
  location: '',
  provider: '',
  confirmationCode: '',
  flightNumber: '',
  seatNumber: '',
  passengerName: '',
  activityNotes: '',
};

function toLocalInputValue(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60_000);
  return local.toISOString().slice(0, 16);
}

function toIso(input: string) {
  if (!input) return null;
  const d = new Date(input);
  return d.toISOString();
}

function renderTimeRange(start: string, end?: string | null) {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!endDate) return fmtTime(startDate);
  return `${fmtTime(startDate)} - ${fmtTime(endDate)}`;
}

function getSegmentMeta(type: string) {
  switch (type) {
    case 'accommodation':
      return {
        icon: '🏨',
        label: 'Stay',
        badgeClass:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/40 dark:text-emerald-100',
      };
    case 'transport':
      return {
        icon: '✈️',
        label: 'Transport',
        badgeClass:
          'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-900/40 dark:text-sky-100',
      };
    case 'activity':
      return {
        icon: '🎟️',
        label: 'Activity',
        badgeClass:
          'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900/60 dark:bg-purple-900/40 dark:text-purple-100',
      };
    case 'note':
      return {
        icon: '📝',
        label: 'Note',
        badgeClass:
          'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
      };
    default:
      return {
        icon: '📌',
        label: 'Other',
        badgeClass:
          'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100',
      };
  }
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);

  const [segmentForm, setSegmentForm] = useState<SegmentFormState>(
    emptySegmentForm,
  );
  const [segmentError, setSegmentError] = useState<string | null>(null);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [showSegmentForm, setShowSegmentForm] = useState(false);
  const [uploadingAttachmentTrip, setUploadingAttachmentTrip] = useState(false);
  const [uploadingAttachmentSegmentId, setUploadingAttachmentSegmentId] =
    useState<string | null>(null);

  const [tripForm, setTripForm] = useState<TripFormState>(emptyTripForm);
  const [tripFormOpen, setTripFormOpen] = useState(false);
  const [tripFormError, setTripFormError] = useState<string | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'attachments' | 'planning'>('overview');
  const [planning, setPlanning] = useState<PlanningData>({
    packing: [],
    ideas: [],
    tasks: [],
    notes: '',
  });
  const [planningCollapsed, setPlanningCollapsed] = useState<Record<keyof PlanningData, boolean>>({
    packing: true,
    ideas: true,
    tasks: true,
    notes: true,
  });
  const [emailPaste, setEmailPaste] = useState('');
  const [parsedEmailSegments, setParsedEmailSegments] = useState<ParsedEmailSegment[]>([]);
  const [parsingEmailError, setParsingEmailError] = useState<string | null>(null);
  const [creatingFromEmail, setCreatingFromEmail] = useState(false);
  const [planningLoaded, setPlanningLoaded] = useState(false);
  const [shares, setShares] = useState<TripShare[]>([]);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharePanelOpen, setSharePanelOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [shareSubmitting, setShareSubmitting] = useState(false);
  const [removingShareId, setRemovingShareId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getTrip(id);
        setTrip(data);
        setTripError(null);

        setTripForm({
          title: data.title,
          mainLocation: data.mainLocation ?? '',
          startDate: data.startDate.slice(0, 10),
          endDate: data.endDate.slice(0, 10),
          notes: data.notes ?? '',
        });
      } catch (err: any) {
        console.error(err);
        setTripError('Could not load trip. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function loadShares(tripId: string) {
    try {
      setSharesLoading(true);
      const data = await listTripShares(tripId);
      setShares(data);
      setShareError(null);
    } catch (err: any) {
      console.error(err);
      setShareError(err.message ?? 'Failed to load collaborators');
    } finally {
      setSharesLoading(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    setPlanningLoaded(false);
    (async () => {
      try {
        const res = await getTripPlanning(id);
        const data = res.planning || {};
        setPlanning({
          packing: Array.isArray(data.packing) ? data.packing : [],
          ideas: Array.isArray(data.ideas) ? data.ideas : [],
          tasks: Array.isArray(data.tasks) ? data.tasks : [],
          notes: typeof data.notes === 'string' ? data.notes : '',
        });
      } catch (err) {
        console.error('Failed to load planning data', err);
      } finally {
        setPlanningLoaded(true);
      }
    })();
  }, [id]);

  const canManageSharing = useMemo(() => {
    if (!trip) return false;
    const isOwner = trip.userId && currentUser?.userId === trip.userId;
    const hasOwnerPermission = trip.accessPermission === 'owner';
    const isAdmin = currentUser?.role === 'admin';
    return Boolean(isOwner || hasOwnerPermission || isAdmin);
  }, [trip, currentUser]);

  const canEditTrip = useMemo(() => {
    if (!trip) return false;
    const isAdmin = currentUser?.role === 'admin';
    if (isAdmin) return true;
    if (trip.userId && currentUser?.userId === trip.userId) return true;
    return trip.accessPermission === 'owner' || trip.accessPermission === 'edit';
  }, [trip, currentUser]);

  useEffect(() => {
    if (trip && canManageSharing) {
      loadShares(trip.id);
      setSharePanelOpen(true);
    }
  }, [trip?.id, canManageSharing]);

  useEffect(() => {
    if (!trip || !planningLoaded || !canEditTrip) return;
    const timer = setTimeout(() => {
      saveTripPlanning(trip.id, planning).catch((err) => console.error('Failed to save planning', err));
    }, 400);
    return () => clearTimeout(timer);
  }, [planning, trip, planningLoaded, canEditTrip]);

  async function handleAddShare(e: React.FormEvent) {
    e.preventDefault();
    if (!trip) return;
    if (!shareEmail.trim()) {
      setShareError('Enter an email to share with');
      return;
    }
    try {
      setShareSubmitting(true);
      const newShare = await addTripShare(trip.id, {
        email: shareEmail.trim(),
        permission: sharePermission,
      });
      setShares((prev) => {
        const existingIdx = prev.findIndex((s) => s.id === newShare.id);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = newShare;
          return copy;
        }
        return [...prev, newShare];
      });
      setShareEmail('');
      setShareError(null);
    } catch (err: any) {
      console.error(err);
      setShareError(err.message ?? 'Failed to share trip');
    } finally {
      setShareSubmitting(false);
    }
  }

  async function handleRemoveShare(shareId: string) {
    if (!trip) return;
    try {
      setRemovingShareId(shareId);
      await removeTripShare(trip.id, shareId);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      setShareError(null);
    } catch (err: any) {
      console.error(err);
      setShareError(err.message ?? 'Failed to remove collaborator');
    } finally {
      setRemovingShareId(null);
    }
  }

  const sortedSegments = useMemo(() => {
    if (!trip?.segments) return [];
    return [...trip.segments].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [trip]);

  const segmentsByDay = useMemo(() => {
    const map: Record<string, Segment[]> = {};
    for (const s of sortedSegments) {
      const d = new Date(s.startTime);
      const key = d.toISOString().slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(s);
    }
    return map;
  }, [sortedSegments]);

  const sortedDayKeys = useMemo(
    () => Object.keys(segmentsByDay).sort(),
    [segmentsByDay],
  );

  const tripNights = useMemo(() => {
    if (!trip) return null;
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    const diffMs = end.getTime() - start.getTime();
    if (!Number.isFinite(diffMs) || diffMs <= 0) return null;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }, [trip]);

  const nextSegment = useMemo(() => {
    if (!sortedSegments.length) return null;
    const now = Date.now();
    for (const s of sortedSegments) {
      const t = new Date(s.startTime).getTime();
      if (Number.isFinite(t) && t >= now) {
        return s;
      }
    }
    return sortedSegments[sortedSegments.length - 1] ?? null;
  }, [sortedSegments]);

  function resetSegmentForm() {
    setSegmentForm(emptySegmentForm);
    setEditingSegmentId(null);
    setSegmentError(null);
  }

  function openSegmentForm() {
    resetSegmentForm();
    setShowSegmentForm(true);
  }

  function closeSegmentForm() {
    resetSegmentForm();
    setShowSegmentForm(false);
  }

  function addPlanningItem(list: keyof PlanningData, text: string) {
    if (!canEditTrip) return;
    if (!text.trim()) return;
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const newItem: ChecklistItem = {
      id,
      text: text.trim(),
      done: false,
    };
    setPlanning((prev) => ({
      ...prev,
      [list]: [...prev[list], newItem],
    }));
    setPlanningCollapsed((prev) => ({ ...prev, [list]: false }));
  }

  function togglePlanningItem(list: keyof PlanningData, itemId: string) {
    if (!canEditTrip) return;
    setPlanning((prev) => ({
      ...prev,
      [list]: prev[list].map((item) =>
        item.id === itemId ? { ...item, done: !item.done } : item,
      ),
    }));
  }

  function removePlanningItem(list: keyof PlanningData, itemId: string) {
    if (!canEditTrip) return;
    setPlanning((prev) => ({
      ...prev,
      [list]: prev[list].filter((item) => item.id !== itemId),
    }));
  }

  function togglePlanningCollapse(list: keyof PlanningData) {
    setPlanningCollapsed((prev) => ({ ...prev, [list]: !prev[list] }));
  }

  function handleNotesChange(value: string) {
    if (!canEditTrip) return;
    setPlanning((prev) => ({ ...prev, notes: value }));
  }

  function toIsoFromParts(datePart: string, timePart?: string, ampm?: string | null): string | null {
    if (!datePart) return null;
    const monthNames = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december',
    ];
    let year: number | null = null;
    let month: number | null = null;
    let day: number | null = null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [y, m, d] = datePart.split('-').map(Number);
      year = y;
      month = m;
      day = d;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(datePart)) {
      const [a, b, c] = datePart.split('/').map(Number);
      // If first part > 12, assume DD/MM/YYYY; otherwise assume MM/DD/YYYY
      if (a > 12) {
        day = a;
        month = b;
      } else {
        month = a;
        day = b;
      }
      year = c < 100 ? 2000 + c : c;
    } else {
      const match = datePart.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
      if (match) {
        const mName = match[1].toLowerCase();
        const idx = monthNames.indexOf(mName);
        if (idx >= 0) {
          month = idx + 1;
          day = Number(match[2]);
          year = Number(match[3]);
        }
      }
    }

    if (!year || !month || !day) return null;

    let hours = 12;
    let minutes = 0;
    if (timePart) {
      const [hStr, mStr] = timePart.split(':');
      hours = Number(hStr);
      minutes = Number(mStr ?? '0');
      const isPm = ampm ? ampm.toLowerCase() === 'pm' : false;
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
    }

    const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));
    if (!Number.isFinite(date.getTime())) return null;
    return date.toISOString();
  }

  function renderNotesContent(text: string) {
    if (!text.trim()) return null;
    return (
      <p className="whitespace-pre-wrap text-[12px] text-slate-700 dark:text-slate-200">
        {text}
      </p>
    );
  }

  function parseEmailSegments(text: string): ParsedEmailSegment[] {
    const segments: ParsedEmailSegment[] = [];
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const dateRe = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/;
    const monthDateRe = /([A-Za-z]+ \d{1,2},?\s*\d{4})/;
    const timeRe = /(\d{1,2}:\d{2})(?:\s?(AM|PM|am|pm))?/;
    const windowTimeRe = /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})(?:\s?(AM|PM|am|pm))?/;

    const hotelIndex = lines.findIndex((l) => /hotel|apartment|inn|stay/i.test(l));
    const hotelName = hotelIndex >= 0 ? lines[hotelIndex] : undefined;
    const addressLine =
      hotelIndex >= 0
        ? lines.slice(hotelIndex + 1).find((l) => /\d{3,}.*[A-Za-z]/.test(l) && l.length < 120)
        : undefined;

    const checkInLine = lines.find((l) => /check-?in/i.test(l));

    const parseLineDate = (line: string) => line.match(dateRe)?.[1] ?? line.match(monthDateRe)?.[1] ?? '';

    let checkInStart: string | null = null;
    let checkInEnd: string | null = null;
    if (checkInLine) {
      const datePart = parseLineDate(checkInLine);
      const windowMatch = checkInLine.match(windowTimeRe);
      if (windowMatch) {
        const [, t1, t2, ampm] = windowMatch;
        checkInStart = toIsoFromParts(datePart, t1, ampm ?? null);
        checkInEnd = toIsoFromParts(datePart, t2, ampm ?? null);
      } else {
        const timeMatch = checkInLine.match(timeRe);
        checkInStart = toIsoFromParts(datePart, timeMatch?.[1], timeMatch?.[2] ?? null);
      }
    }

    if (checkInLine) {
      segments.push({
        title: hotelName ? `${hotelName} check-in` : 'Accommodation check-in',
        type: 'accommodation',
        startTime: checkInStart ?? undefined,
        endTime: checkInEnd ?? undefined,
        location: addressLine || hotelName,
        raw: checkInLine,
      });
    }

    const ignoreLine = (line: string) => /stay safe|security|cashback|learn more|terms|conditions/i.test(line);

    for (const line of lines) {
      if (ignoreLine(line)) continue;
      const datePart = parseLineDate(line);
      if (!datePart) continue;
      const timeWindow = line.match(windowTimeRe);
      const timeMatch = line.match(timeRe);
      const atMatch = line.match(/(?:@| at )(.+)/i);
      const cleaned = line
        .replace(dateRe, '')
        .replace(monthDateRe, '')
        .replace(timeRe, '')
        .replace(windowTimeRe, '')
        .replace(/@.*/, '')
        .replace(/ at .*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
      const title = cleaned || line.slice(0, 80);

      let startTime: string | null = null;
      let endTime: string | null = null;
      if (timeWindow) {
        const [, t1, t2, ampm] = timeWindow;
        startTime = toIsoFromParts(datePart, t1, ampm ?? null);
        endTime = toIsoFromParts(datePart, t2, ampm ?? null);
      } else if (timeMatch) {
        startTime = toIsoFromParts(datePart, timeMatch[1], timeMatch[2] ?? null);
      } else {
        startTime = toIsoFromParts(datePart, undefined, null);
      }

      segments.push({
        title,
        startTime: startTime ?? undefined,
        endTime: endTime ?? undefined,
        location: atMatch ? atMatch[1].trim() : addressLine || hotelName,
        raw: line,
        type: /hotel|apartment|inn|stay/i.test(line) ? 'accommodation' : 'activity',
      });
    }

    return segments;
  }

  async function handleParseEmail() {
    try {
      setParsingEmailError(null);
      const parsed = parseEmailSegments(emailPaste);
      setParsedEmailSegments(parsed);
      setPlanningCollapsed((prev) => ({ ...prev, tasks: true, ideas: true, packing: true, notes: true }));
    } catch (err: any) {
      setParsingEmailError('Could not parse email. Please try again.');
    }
  }

  async function handleCreateSegmentFromEmail(seg: ParsedEmailSegment) {
    if (!id) return;
    try {
      setCreatingFromEmail(true);
      const payload: any = {
        type: seg.type ?? 'activity',
        title: seg.title || 'New segment',
      };
      if (seg.startTime) payload.startTime = seg.startTime;
      if (seg.endTime) payload.endTime = seg.endTime;
      if (seg.location) payload.location = seg.location;
      const updated = await createSegment(id, payload);
      setTrip(updated);
    } catch (err) {
      console.error(err);
      alert('Could not create segment from email.');
    } finally {
      setCreatingFromEmail(false);
    }
  }






  function handleTripFieldChange<K extends keyof TripFormState>(
    key: K,
    value: TripFormState[K],
  ) {
    setTripForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveTripDetails(e: any) {
    e.preventDefault();
    if (!id) return;

    if (tripForm.startDate && tripForm.endDate) {
      const s = new Date(tripForm.startDate);
      const eDate = new Date(tripForm.endDate);
      if (eDate < s) {
        setTripFormError('End date cannot be before start date.');
        return;
      }
    }

    try {
      setTripFormError(null);
      const payload = {
        title: tripForm.title || trip?.title || '',
        mainLocation: tripForm.mainLocation || undefined,
        startDate: tripForm.startDate
          ? new Date(tripForm.startDate).toISOString()
          : trip?.startDate,
        endDate: tripForm.endDate
          ? new Date(tripForm.endDate).toISOString()
          : trip?.endDate,
        notes: tripForm.notes || undefined,
      };
      const updated = await api<TripDetail>(`/trips/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setTrip(updated);
      setTripFormOpen(false);
    } catch (err: any) {
      console.error(err);
      setTripFormError('Failed to update trip details. Please try again.');
    }
  }

  function handleSegmentFieldChange<
    K extends keyof SegmentFormState,
  >(key: K, value: SegmentFormState[K]) {
    setSegmentForm((prev) => ({ ...prev, [key]: value }));
  }

  
  async function handleSegmentSubmit(e: any) {
    e.preventDefault();
    if (!id || !canEditTrip) return;

    if (!segmentForm.startTime && segmentForm.type !== 'note') {
      setSegmentError('Start time is required.');
      return;
    }

    const trimmedAddress = (segmentForm.location || '').trim();
    if (
      trimmedAddress &&
      (trimmedAddress.length < 5 ||
        !/\d/.test(trimmedAddress) ||
        !/[A-Za-z]/.test(trimmedAddress))
    ) {
      setSegmentError(
        'Please enter a more complete street address (e.g. "123 Main St, Suburb").',
      );
      return;
    }

    try {
      setSegmentError(null);

      let startString = segmentForm.startTime;
      if (!startString && segmentForm.type === 'note') {
        if (trip?.startDate) {
          startString = `${trip.startDate}T09:00`;
        } else {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(today.getDate()).padStart(2, '0');
          startString = `${yyyy}-${mm}-${dd}T09:00`;
        }
      }

      const notes =
        (segmentForm.activityNotes || '').trim();

      const payload: any = {
        type: segmentForm.type,
        transportMode:
          segmentForm.type === 'transport'
            ? segmentForm.transportMode || null
            : null,
        title: segmentForm.title || undefined,
        startTime: toIso(startString),
        endTime: toIso(segmentForm.endTime),
        location: segmentForm.location || undefined,
        provider: segmentForm.provider || undefined,
        confirmationCode: segmentForm.confirmationCode || undefined,
        flightNumber: segmentForm.flightNumber || undefined,
        seatNumber: segmentForm.seatNumber || undefined,
        passengerName: segmentForm.passengerName || undefined,
        details: notes ? { activityNotes: notes } : undefined,
      };

      let updatedTrip: TripDetail;
      if (editingSegmentId) {
        updatedTrip = await updateSegment(editingSegmentId, payload);
      } else {
        updatedTrip = await createSegment(id, payload);
      }

      setTrip(updatedTrip);
      resetSegmentForm();
    } catch (err: any) {
      console.error(err);
      setSegmentError('Failed to save segment. Please try again.');
    }
  }

  function handleEditSegment(seg: Segment) {
    if (!canEditTrip) return;
    setEditingSegmentId(seg.id);
    setShowSegmentForm(true);
    setSegmentForm({
      id: seg.id,
      type: seg.type,
      transportMode:
        seg.type === 'transport' && seg.transportMode
          ? seg.transportMode
          : seg.type === 'flight'
          ? 'flight'
          : '',
      title: seg.title ?? '',
      startTime: toLocalInputValue(seg.startTime),
      endTime: seg.endTime ? toLocalInputValue(seg.endTime) : '',
      location: seg.location ?? '',
      provider: seg.provider ?? '',
      confirmationCode: seg.confirmationCode ?? '',
      flightNumber: seg.flightNumber ?? '',
      seatNumber: seg.seatNumber ?? '',
      passengerName: seg.passengerName ?? '',
      activityNotes:
        typeof (seg as any).details === 'string'
          ? (seg as any).details
          : (seg as any).details?.activityNotes ??
            (seg as any).details?.notes ??
            '',
    });
  }

  async function handleDeleteSegment(seg: Segment) {
    if (!canEditTrip) return;
    if (!id) return;
    if (!confirm('Delete this segment?')) return;
    try {
      await deleteSegment(seg.id);
      const updatedTrip = await getTrip(id);
      setTrip(updatedTrip);
      if (editingSegmentId === seg.id) resetSegmentForm();
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete segment.');
    }
  }

async function handleImageChange(e: any) {
    if (!id) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const updated = await uploadTripImage(id, file);
      setTrip(updated);
    } catch (err: any) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <NavBar />
        <main className="mx-auto flex max-w-5xl flex-1 items-center justify-center px-4">
          <p className="text-sm text-slate-500 dark:text-slate-300">
            Loading trip...
          </p>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <NavBar />
        <main className="mx-auto flex max-w-5xl flex-1 items-center justify-center px-4">
          <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
            {tripError || 'Trip not found.'}
          </div>
        </main>
      </div>
    );
  }

  const today = new Date();
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntil = Math.ceil(
    (start.getTime() - today.getTime()) / msPerDay,
  );
  const isUpcoming = daysUntil > 0;
  const isToday = daysUntil === 0;
  const isPast = today > end;

  let statusLabel = '';
  let statusClass =
    'border-slate-200 bg-slate-50 text-slate-700 dark;border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  if (isUpcoming) {
    statusLabel = `Starts in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
    statusClass =
      'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100';
  } else if (isToday) {
    statusLabel = 'Starts today';
    statusClass =
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100';
  } else if (isPast) {
    statusLabel = 'Completed';
    statusClass =
      'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300';
  } else {
    statusLabel = 'In progress';
    statusClass =
      'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100';
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-gradient-to-b dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <NavBar />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 pb-8 pt-4">
        {/* Trip header */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="relative h-48 w-full overflow-hidden">
            {trip.imagePath ? (
              <img
                src={buildImageUrl(trip.imagePath)}
                alt={trip.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950 text-slate-300">
                <span className="text-sm font-medium opacity-80">
                  No cover image yet
                </span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-6 pb-4 text-white">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1 inline-flex items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                      Trip overview
                    </span>
                    {statusLabel && (
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium backdrop-blur ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    )}
                  </div>
                  <h1 className="truncate text-2xl font-semibold tracking-tight">
                    {trip.title}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-100/80">
                    {trip.mainLocation && (
                      <span className="inline-flex items-center gap-1">
                        <span>📍</span>
                        <span>{trip.mainLocation}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <span>🗓</span>
                      <span>
                        {new Date(trip.startDate).toLocaleDateString()} -{' '}
                        {new Date(trip.endDate).toLocaleDateString()}
                      </span>
                    </span>
                    {sortedSegments.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span>🧭</span>
                        <span>{sortedSegments.length} segments</span>
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  {canEditTrip && (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur hover:bg-white/20">
                      <span>{uploadingImage ? 'Uploading...' : 'Change cover'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                        disabled={uploadingImage}
                      />
                    </label>
                  )}

                  {canManageSharing && (
                    <button
                      type="button"
                      onClick={() => setSharePanelOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1 rounded-full border border-white/30 px-3 py-1 text-xs font-medium text-white backdrop-blur hover:bg-white/10"
                    >
                      Share trip {shares.length > 0 ? `(${shares.length})` : ''}
                    </button>
                  )}

                  {canEditTrip && (
                    <button
                      type="button"
                      onClick={openSegmentForm}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-emerald-400"
                    >
                      + Add segment
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setTripFormOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur hover:bg-white/20"
                    style={{ display: canEditTrip ? 'inline-flex' : 'none' }}
                  >
                    ✏️ Edit details
                  </button>
                </div>

              </div>
              {trip.notes && (
                <p className="max-w-2xl text-xs text-slate-100/90">
                  {trip.notes}
                </p>
              )}
            </div>
          </div>
        </section>

        {(canManageSharing || shares.length > 0) && (
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  Collaborators
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Share this trip with teammates and set their permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSharePanelOpen((prev) => !prev)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {sharePanelOpen ? 'Hide' : 'Show'}
              </button>
            </div>

            {shareError && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                {shareError}
              </div>
            )}

            {sharePanelOpen && (
              <div className="mt-3 space-y-3">
                {canManageSharing && (
                  <form onSubmit={handleAddShare} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className="flex-1">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          User email
                        </label>
                        <input
                          type="email"
                          required
                          value={shareEmail}
                          onChange={(e) => setShareEmail(e.target.value)}
                          placeholder="someone@example.com"
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none ring-blue-500/50 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="w-full sm:w-40">
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Permission
                        </label>
                        <select
                          value={sharePermission}
                          onChange={(e) => setSharePermission(e.target.value as 'view' | 'edit')}
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none ring-blue-500/50 focus:ring dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="view">View only</option>
                          <option value="edit">Edit</option>
                        </select>
                      </div>
                      <div className="self-end">
                        <button
                          type="submit"
                          disabled={shareSubmitting}
                          className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                        >
                          {shareSubmitting ? 'Sharing...' : 'Share'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {sharesLoading && <div className="text-xs text-slate-500 dark:text-slate-400">Loading collaborators…</div>}
                  {!sharesLoading && shares.length === 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      No collaborators yet.
                    </div>
                  )}
                  {!sharesLoading &&
                    shares.map((share) => (
                      <div
                        key={share.id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/90 p-3 text-xs shadow-sm dark:border-slate-800 dark:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {share.user.email}
                            </span>
                            <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                              {share.permission}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Role: {share.user.role} · Status: {share.user.status} · Joined {new Date(share.user.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        {canManageSharing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveShare(share.id)}
                            disabled={removingShareId === share.id}
                            className="inline-flex items-center rounded-full border border-rose-200 px-3 py-1 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:text-rose-200 dark:hover:bg-rose-900/30"
                          >
                            {removingShareId === share.id ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Trip tabs */}
        <section className="mt-3 flex items-center justify-between">
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs dark:bg-slate-900/70">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`rounded-full px-3 py-1 font-medium transition ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('itinerary')}
              className={`rounded-full px-3 py-1 font-medium transition ${
                activeTab === 'itinerary'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Itinerary
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attachments')}
              className={`rounded-full px-3 py-1 font-medium transition ${
                activeTab === 'attachments'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Attachments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('planning')}
              className={`rounded-full px-3 py-1 font-medium transition ${
                activeTab === 'planning'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Planning
            </button>
          </div>
        </section>

        {/* Trip summary strip */}
        <section className="mt-3">
          <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/5 text-sm dark:bg-slate-800">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-slate-700 dark:text-slate-200"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M5 7.5h14M5 12h14M5 16.5h9" strokeLinecap="round" />
                </svg>
              </span>
              <div className="flex flex-col">
                <span className="font-semibold">
                  {sortedSegments.length || 0} segment{sortedSegments.length === 1 ? '' : 's'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Organised across your trip
                </span>
              </div>
            </div>
            {tripNights !== null && (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/5 text-sm dark:bg-slate-800">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-slate-700 dark:text-slate-200"
                    aria-hidden="true"
                    fill="currentColor"
                  >
                    <path d="M17.25 3.5A7.75 7.75 0 1 0 20.5 15a.75.75 0 0 0-1.06-.28 5.25 5.25 0 0 1-5.9-8.64.75.75 0 0 0 .21-.92 7.74 7.74 0 0 0-1.26-1.66Z" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {tripNights} night{tripNights === 1 ? '' : 's'}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    From start to end dates
                  </span>
                </div>
              </div>
            )}
            {nextSegment && (
              <div className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/5 text-sm dark:bg-slate-800">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 text-slate-700 dark:text-slate-200"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M12 6v6h4.5M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <span className="font-semibold">
                    Next: {nextSegment.title || getSegmentMeta(nextSegment.type).label}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {new Date(nextSegment.startTime).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {activeTab === 'overview' && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-800 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Today &amp; next up
              </h3>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800/60 dark:bg-slate-900/60">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Today
                  </span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-500">
                    {trip && new Date(trip.startDate) <= new Date() && new Date(trip.endDate) >= new Date()
                      ? 'In this trip'
                      : 'Outside trip dates'}
                  </span>
                </div>
                {sortedSegments.some((s) => new Date(s.startTime).toDateString() === new Date().toDateString()) ? (
                  <ul className="space-y-2">
                    {sortedSegments
                      .filter((s) => new Date(s.startTime).toDateString() === new Date().toDateString())
                      .slice(0, 3)
                      .map((s) => (
                        <li
                          key={s.id}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                              {s.title || getSegmentMeta(s.type).label}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              {renderTimeRange(s.startTime, s.endTime)}
                            </span>
                          </div>
                          {s.location && (
                            <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span className="truncate">{s.location}</span>
                              <button
                                type="button"
                                className="text-[10px] font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
                                onClick={() => {
                                  window.open(
                                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                      s.location ?? '',
                                    )}`,
                                    '_blank',
                                  );
                                }}
                              >
                                Map
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    No segments scheduled for today.
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800/60 dark:bg-slate-900/60">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Next up
                  </span>
                </div>
                {nextSegment ? (
                  <div className="space-y-1 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                        {nextSegment.title || getSegmentMeta(nextSegment.type).label}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {renderTimeRange(nextSegment.startTime, nextSegment.endTime)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {new Date(nextSegment.startTime).toLocaleString()}
                    </div>
                    {nextSegment.location && (
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="truncate">{nextSegment.location}</span>
                        <button
                          type="button"
                          className="text-[10px] font-medium text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200"
                          onClick={() => {
                            window.open(
                              `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                nextSegment.location ?? '',
                              )}`,
                              '_blank',
                            );
                          }}
                        >
                          Map
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    No upcoming segments found.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'attachments' && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Attachments
              </h3>
              {canEditTrip && (
                <label className="cursor-pointer text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
                  {uploadingAttachmentTrip ? 'Uploading...' : 'Attach file'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={async (e) => {
                      if (!trip || !id || !e.target.files?.[0]) return;
                      try {
                        setUploadingAttachmentTrip(true);
                        await uploadTripAttachment(id, e.target.files[0]);
                        const fresh = await getTrip(id);
                        setTrip(fresh);
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setUploadingAttachmentTrip(false);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              )}
            </div>
            {Array.isArray(trip.attachments) &&
            trip.attachments.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {trip.attachments.map((att: Attachment) => (
                  <li key={att.id} className="flex items-center justify-between gap-2">
                    <a
                      href={buildImageUrl(att.path)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {att.originalName}
                    </a>
                    {canEditTrip && (
                      <button
                        type="button"
                        className="text-[10px] text-slate-400 hover:text-red-500"
                        onClick={async () => {
                          if (!id) return;
                          if (!confirm('Delete this attachment?')) return;
                          try {
                            await deleteTripAttachment(id, att.id);
                            const fresh = await getTrip(id);
                            setTrip(fresh);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No attachments yet.
              </p>
            )}
          </section>
        )}


        {/* Trip details modal */}
        {tripFormOpen && (
          <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Edit trip details
                </h2>
                <button
                  type="button"
                  onClick={() => setTripFormOpen(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                >
                  Close
                </button>
              </div>
              {tripFormError && (
                <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
                  {tripFormError}
                </div>
              )}
              <form
                onSubmit={handleSaveTripDetails}
                className="space-y-3 text-xs text-slate-700 dark:text-slate-200"
              >
                <div>
                  <label className="mb-1 block font-medium">Title</label>
                  <input
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                    value={tripForm.title}
                    onChange={(e) =>
                      handleTripFieldChange('title', e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium">Main location</label>
                  <input
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                    value={tripForm.mainLocation}
                    onChange={(e) =>
                      handleTripFieldChange('mainLocation', e.target.value)
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium">Start date</label>
                    <input
                      type="date"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                      value={tripForm.startDate}
                      onChange={(e) =>
                        handleTripFieldChange('startDate', e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-medium">End date</label>
                    <input
                      type="date"
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                      value={tripForm.endDate}
                      onChange={(e) =>
                        handleTripFieldChange('endDate', e.target.value)
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-medium">Notes</label>
                  <textarea
                    className="min-h-[60px] w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                    value={tripForm.notes}
                    onChange={(e) =>
                      handleTripFieldChange('notes', e.target.value)
                    }
                  />
                </div>
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setTripFormOpen(false)}
                    className="rounded-full px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'planning' && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Planning
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Keep packing lists, ideas, and pre-trip tasks in one place. Shared with collaborators.
                </p>
              </div>
              <div className="text-[11px] text-slate-400">
                Trip: {trip.title}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {(['packing', 'ideas', 'tasks'] as Array<keyof PlanningData>).map((key) => {
                const heading =
                  key === 'packing'
                    ? 'Packing list'
                    : key === 'ideas'
                    ? 'Ideas'
                    : 'Pre-trip tasks';
                const placeholder =
                  key === 'packing'
                    ? 'Add an item to pack'
                    : key === 'ideas'
                    ? 'Add an activity/accommodation/dining idea'
                    : 'Add a task to complete';
                const collapsed = planningCollapsed[key];
                const doneCount = planning[key].filter((i) => i.done).length;
                const totalCount = planning[key].length;

                return (
                  <div
                    key={key}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80"
                  >
                    <button
                      type="button"
                      onClick={() => togglePlanningCollapse(key)}
                      className="flex items-center justify-between rounded-lg bg-slate-100 px-2 py-1 text-left text-sm font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    >
                      <span>{heading}</span>
                      <span className="flex items-center gap-2 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        <span>{totalCount} item{totalCount === 1 ? '' : 's'} ({doneCount} done)</span>
                        <span>{collapsed ? '▸' : '▾'}</span>
                      </span>
                    </button>

                    {!collapsed && (
                      <>
                        {canEditTrip ? (
                          <PlanningInput
                            placeholder={placeholder}
                            onAdd={(text) => addPlanningItem(key, text)}
                          />
                        ) : (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            View only — shared by the owner.
                          </p>
                        )}
                        {planning[key].length === 0 ? (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Nothing here yet.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {planning[key].map((item) => (
                              <li
                                key={item.id}
                                className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white/70 px-2 py-1.5 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800/70"
                              >
                                <label className="flex flex-1 cursor-pointer items-start gap-2">
                                  <input
                                    type="checkbox"
                                    className="mt-0.5"
                                    checked={item.done}
                                    disabled={!canEditTrip}
                                    onChange={() => togglePlanningItem(key, item.id)}
                                  />
                                  <span className={item.done ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}>
                                    {item.text}
                                  </span>
                                </label>
                                {canEditTrip && (
                                  <button
                                    type="button"
                                    className="text-[11px] text-slate-400 hover:text-red-500"
                                    onClick={() => removePlanningItem(key, item.id)}
                                  >
                                    Remove
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => togglePlanningCollapse('notes')}
                className="flex w-full items-center justify-between rounded-lg bg-slate-100 px-2 py-1 text-left text-sm font-semibold text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                <span>Notes &amp; inspiration</span>
                <span className="flex items-center gap-2 text-[11px] font-normal text-slate-500 dark:text-slate-400">
                  {planning.notes.trim() ? 'Editing' : 'Empty'}
                  <span>{planningCollapsed.notes ? '▸' : '▾'}</span>
                </span>
              </button>
              {!planningCollapsed.notes && (
                <div className="mt-2 space-y-2">
                  <textarea
                    className="h-28 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                    value={planning.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    readOnly={!canEditTrip}
                    disabled={!canEditTrip}
                    placeholder="Quick notes, ideas, or reminders"
                  />
                </div>
              )}
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
              <h4 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                Paste email to create segments
              </h4>
              <p className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
                Paste confirmation or booking emails. We will attempt to pick out titles, dates, times, and locations. Review before adding.
              </p>
              <textarea
                className="h-32 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                value={emailPaste}
                onChange={(e) => setEmailPaste(e.target.value)}
                placeholder="Paste email text here"
              />
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleParseEmail}
                  className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                  Parse email
                </button>
                {parsingEmailError && (
                  <span className="text-[11px] text-red-500">{parsingEmailError}</span>
                )}
              </div>
              {parsedEmailSegments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {parsedEmailSegments.map((seg, idx) => (
                    <div
                      key={`${seg.title}-${idx}`}
                      className="rounded-lg border border-slate-200 bg-white/80 p-2 text-[11px] shadow-sm dark:border-slate-700 dark:bg-slate-800/80"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {seg.title || 'Untitled'}
                        </div>
                        <button
                          type="button"
                          disabled={creatingFromEmail}
                          onClick={() => handleCreateSegmentFromEmail(seg)}
                          className="rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                        >
                          {creatingFromEmail ? 'Adding...' : 'Add segment'}
                        </button>
                      </div>
                      <div className="mt-1 text-slate-500 dark:text-slate-300">
                        {seg.startTime ? new Date(seg.startTime).toLocaleString() : 'No time detected'}
                      </div>
                      {seg.location && (
                        <div className="text-slate-500 dark:text-slate-300">Location: {seg.location}</div>
                      )}
                      <div className="mt-1 text-slate-400 dark:text-slate-400">Source: {seg.raw}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'itinerary' && (
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Itinerary
              </h2>
              <button
                type="button"
                onClick={openSegmentForm}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                + Add segment
              </button>
            </div>
            {sortedDayKeys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-100/60 p-3 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                No segments yet. Use the Add segment button above to start planning.
              </div>
            ) : (
              <div className="space-y-4">
                {sortedDayKeys.map((dayKey) => {
                  const daySegments = segmentsByDay[dayKey];
                  const date = new Date(dayKey);
                  const dateLabel = date.toLocaleDateString();
                  const weekdayLabel = date.toLocaleDateString(undefined, { weekday: 'long' });

                  return (
                    <div
                      key={dayKey}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="mb-3 flex items-center gap-3 text-xs font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/5 text-base dark:bg-slate-800">
                          📅
                        </div>
                        <div>
                          <div>{dateLabel}</div>
                          <div className="text-[11px] font-normal text-slate-400 dark:text-slate-400">
                            {weekdayLabel}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        {daySegments.map((s) => {
                          const meta = getSegmentMeta(s.type);
                          const accentClass =
                            s.type === 'transport'
                              ? 'border-sky-400/80'
                              : s.type === 'activity'
                              ? 'border-purple-400/80'
                              : s.type === 'accommodation'
                              ? 'border-emerald-400/80'
                              : 'border-slate-500/70';

                          return (
                            <div key={s.id} className="relative grid grid-cols-[auto,1fr] gap-4">
                              <div className="relative flex items-stretch justify-center">
                                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200 dark:bg-slate-700" />
                                <div className="relative z-10 mt-2 h-3 w-3 rounded-full border-2 border-sky-400 bg-white dark:bg-slate-900" />
                              </div>
                              <div
                                className={`group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm ring-1 ring-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/80 ${accentClass} border-l-4`}
                              >
                                <div className="flex flex-1 gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-700">
                                    {meta.icon}
                                  </div>
                                  <div>
                                    <div className="mb-1 flex items-center gap-2">
                                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                        {s.title}
                                      </span>
                                      <span
                                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${meta.badgeClass}`}
                                      >
                                        {meta.label}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-300">
                                      {renderTimeRange(s.startTime, s.endTime)}
                                    </div>
                                    <div className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-300">
                                      {s.type !== 'note' && (s.location || s.provider) && (
                                        <div className="flex items-center gap-2">
                                          <div className="truncate">
                                            {s.location}
                                            {s.location && s.provider && ' · '}
                                            {s.provider}
                                          </div>
                                          {s.location && (
                                            <a
                                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                s.location ?? '',
                                              )}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-600"
                                              title="Open in Google Maps"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                className="h-3 w-3"
                                                aria-hidden="true"
                                              >
                                                <path d="M12 2.5a6 6 0 0 0-6 6c0 4.16 5.1 9.36 5.32 9.58.37.36.99.36 1.36 0C12.9 17.86 18 12.66 18 8.5a6 6 0 0 0-6-6zm0 8.25a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5z" />
                                              </svg>
                                              <span>Map</span>
                                            </a>
                                          )}
                                        </div>
                                      )}
                                      {s.type !== 'note' && s.confirmationCode && (
                                        <div className="text-[11px] text-slate-400 dark:text-slate-400">
                                          Ref: {s.confirmationCode}
                                        </div>
                                      )}
                                      {(s.details &&
                                        (typeof s.details === 'string'
                                          ? s.details
                                          : s.details.activityNotes ?? s.details.notes)) && (
                                        <div className="mt-1 rounded-md bg-slate-100 p-2 text-[11px] leading-snug text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                                          {typeof s.details === 'string'
                                            ? s.details
                                            : s.details.activityNotes ?? s.details.notes}
                                        </div>
                                      )}
                                      <div className="mt-1 flex items-start justify-between text-[11px] text-slate-400 dark:text-slate-400">
                                        {canEditTrip && (
                                          <label className="cursor-pointer hover:underline">
                                            {uploadingAttachmentSegmentId === s.id ? 'Uploading...' : 'Attach file'}
                                            <input
                                              type="file"
                                              className="hidden"
                                              onChange={async (e) => {
                                                if (!trip || !id || !e.target.files?.[0]) return;
                                                try {
                                                  setUploadingAttachmentSegmentId(s.id);
                                                  await uploadSegmentAttachment(s.id, e.target.files[0]);
                                                  const fresh = await getTrip(id);
                                                  setTrip(fresh);
                                                } catch (err) {
                                                  console.error(err);
                                                } finally {
                                                  setUploadingAttachmentSegmentId(null);
                                                  e.target.value = '';
                                                }
                                              }}
                                            />
                                          </label>
                                        )}
                                        <div className="ml-2 flex-1 text-right">
                                          {Array.isArray(s.attachments) && s.attachments.length > 0 && (
                                            <ul className="space-y-1">
                                              {s.attachments.map((att: Attachment) => (
                                                <li
                                                  key={att.id}
                                                  className="flex items-center justify-end gap-2"
                                                >
                                                  <a
                                                    href={buildImageUrl(att.path)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="truncate text-[10px] text-blue-600 hover:underline dark:text-blue-400"
                                              >
                                                {att.originalName}
                                              </a>
                                              {canEditTrip && (
                                                <button
                                                  type="button"
                                                  className="text-[10px] text-slate-400 hover:text-red-500"
                                                  onClick={async () => {
                                                    if (!id) return;
                                                    if (!confirm('Delete this attachment?')) return;
                                                    try {
                                                      await deleteSegmentAttachment(s.id, att.id);
                                                      const fresh = await getTrip(id);
                                                      setTrip(fresh);
                                                    } catch (err) {
                                                      console.error(err);
                                                    }
                                                  }}
                                                >
                                                  Remove
                                                </button>
                                              )}
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      </div>
                                    {(s.flightNumber || s.seatNumber || s.passengerName) && (
                                      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-300">
                                        {s.flightNumber && (
                                          <span className="inline-flex items-center gap-1">
                                            <span>✈️</span>
                                            <span>{s.flightNumber}</span>
                                          </span>
                                        )}
                                        {s.seatNumber && (
                                          <span className="inline-flex items-center gap-1">
                                            <span>💺</span>
                                            <span>{s.seatNumber}</span>
                                          </span>
                                        )}
                                        {s.passengerName && (
                                          <span className="inline-flex items-center gap-1">
                                            <span>👤</span>
                                            <span>{s.passengerName}</span>
                                          </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {canEditTrip && (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleEditSegment(s)}
                                      className="rounded-full px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSegment(s)}
                                      className="rounded-full px-2 py-1 text-[11px] text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {showSegmentForm && (
          <div className="fixed inset-0 z-30 flex items-start justify-center bg-black/50 px-4 py-8">
            <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {editingSegmentId ? 'Edit segment' : 'New segment'}
                  </h2>
                  {segmentError && (
                    <p className="text-xs text-red-600 dark:text-red-300">{segmentError}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={closeSegmentForm}
                  className="rounded-full px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            <form
              onSubmit={handleSegmentSubmit}
              className="grid grid-cols-1 gap-3 text-xs text-slate-700 md:grid-cols-2 dark:text-slate-200"
            >
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Type
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.type}
                  onChange={(e) =>
                    handleSegmentFieldChange('type', e.target.value)
                  }
                >
                  <option value="transport">Transport</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="activity">Activity</option>
                  <option value="note">Note</option>
                </select>
                {segmentForm.type === 'transport' && (
                  <div className="mt-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                      Mode
                    </label>
                    <select
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                      value={segmentForm.transportMode}
                      onChange={(e) =>
                        handleSegmentFieldChange(
                          'transportMode',
                          e.target.value,
                        )
                      }
                    >
                      <option value="flight">Flight</option>
                      <option value="train">Train</option>
                      <option value="bus">Bus</option>
                      <option value="taxi">Taxi</option>
                      <option value="rideshare">Rideshare</option>
                      <option value="drive">Drive</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Title
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.title}
                  onChange={(e) =>
                    handleSegmentFieldChange('title', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  {segmentForm.type === 'accommodation' ? 'Check-in time' : 'Start time'}
                </label>
                <input
                  type="datetime-local"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.startTime}
                  onChange={(e) =>
                    handleSegmentFieldChange('startTime', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  {segmentForm.type === 'accommodation' ? 'Check-out time' : 'End time'}
                </label>
                <input
                  type="datetime-local"
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.endTime}
                  onChange={(e) =>
                    handleSegmentFieldChange('endTime', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Address
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.location}
                  onChange={(e) =>
                    handleSegmentFieldChange('location', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Provider
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark;border-slate-600 dark:bg-slate-900"
                  value={segmentForm.provider}
                  onChange={(e) =>
                    handleSegmentFieldChange('provider', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Confirmation code
                </label>
                <input
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  value={segmentForm.confirmationCode}
                  onChange={(e) =>
                    handleSegmentFieldChange(
                      'confirmationCode',
                      e.target.value,
                    )
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                  Activity notes / details
                </label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                  rows={3}
                  value={segmentForm.activityNotes}
                  onChange={(e) =>
                    handleSegmentFieldChange('activityNotes', e.target.value)
                  }
                  placeholder="Optional notes, booking info, or instructions for this activity"
                />
              </div>


              {segmentForm.type === 'transport' &&
                segmentForm.transportMode === 'flight' && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                        Flight number
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                        value={segmentForm.flightNumber}
                        onChange={(e) =>
                          handleSegmentFieldChange(
                            'flightNumber',
                            e.target.value,
                          )
                        }
                        placeholder="e.g. QF15"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                        Seat number
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                        value={segmentForm.seatNumber}
                        onChange={(e) =>
                          handleSegmentFieldChange(
                            'seatNumber',
                            e.target.value,
                          )
                        }
                        placeholder="e.g. 32A"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-200">
                        Passenger name
                      </label>
                      <input
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-sm outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
                        value={segmentForm.passengerName}
                        onChange={(e) =>
                          handleSegmentFieldChange(
                            'passengerName',
                            e.target.value,
                          )
                        }
                        placeholder="Name on booking"
                      />
                    </div>
                  </>
                )}

              <div className="mt-2 flex items-center justify-between md:col-span-2">
                <button
                  type="button"
                  onClick={resetSegmentForm}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={!canEditTrip}
                  className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 dark:bg-blue-500 dark:hover:bg-blue-400"
                >
                  {editingSegmentId ? 'Update segment' : 'Add segment'}
                </button>
              </div>
            </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


function PlanningInput({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [value, setValue] = React.useState('');

  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onAdd(value);
        setValue('');
      }}
    >
      <input
        className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs outline-none ring-blue-500/50 focus:bg-white focus:ring dark:border-slate-600 dark:bg-slate-900"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="submit"
        className="rounded-full bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400"
      >
        Add
      </button>
    </form>
  );
}

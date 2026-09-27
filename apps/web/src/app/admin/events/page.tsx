'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Activity
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { Event, CreateEventInput, UserRole } from '@qr-menu/shared';

export default function AdminEventsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEventType, setFormEventType] = useState('PROMOTION');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await adminService.getEvents(restaurantId, token);
      setEvents(data || []);
    } catch (err) {
      console.warn('[AdminEvents] Failed to fetch events', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId, token]);

  const openCreateModal = () => {
    setEditing(null);
    setFormName('');
    setFormDescription('');
    setFormEventType('PROMOTION');
    
    // Default dates
    const now = new Date();
    setFormStartDate(now.toISOString().slice(0, 16));
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setFormEndDate(nextWeek.toISOString().slice(0, 16));
    
    setFormIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (event: Event) => {
    setEditing(event);
    setFormName(event.name);
    setFormDescription(event.description || '');
    setFormEventType(event.eventType);
    
    // Format dates for datetime-local input
    setFormStartDate(new Date(event.startDate).toISOString().slice(0, 16));
    setFormEndDate(new Date(event.endDate).toISOString().slice(0, 16));
    
    setFormIsActive(event.isActive);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError('');

    if (!formName.trim() || !formEventType.trim()) {
      setFormError('Name and event type are required.');
      return;
    }
    
    if (new Date(formEndDate) <= new Date(formStartDate)) {
      setFormError('End date must be after start date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const input: CreateEventInput = {
        restaurantId,
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        eventType: formEventType,
        startDate: new Date(formStartDate).toISOString(),
        endDate: new Date(formEndDate).toISOString(),
        isActive: formIsActive,
      };

      if (editing) {
        await adminService.updateEvent(editing.id, input, token);
      } else {
        await adminService.createEvent(input, token);
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (event: Event) => {
    if (!token) return;
    try {
      await adminService.updateEvent(event.id, { isActive: !event.isActive }, token);
      fetchData();
    } catch (err) {
      console.warn('[AdminEvents] Failed to toggle event', err);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteId) return;
    setIsDeleting(true);
    try {
      await adminService.deleteEvent(deleteId, token);
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.warn('[AdminEvents] Failed to delete event', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.eventType.toLowerCase().includes(q) ||
      (e.description && e.description.toLowerCase().includes(q))
    );
  });

  const activeCount = events.filter((e) => e.isActive && new Date(e.endDate) > new Date()).length;
  const upcomingCount = events.filter((e) => e.isActive && new Date(e.startDate) > new Date()).length;
  const pastCount = events.filter((e) => new Date(e.endDate) < new Date()).length;

  return (
    <AdminLayout
      title="Event Management"
      subtitle="Manage Promotions, Themed Nights, and Special Events"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Active Now</p>
                  <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Upcoming</p>
                  <p className="text-2xl font-bold text-slate-900">{upcomingCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Past Events</p>
                  <p className="text-2xl font-bold text-slate-900">{pastCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-xs bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition"
            >
              <Plus className="w-4 h-4" />
              Create Event
            </button>
          </div>

          {/* ── Events Table ── */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Event Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Type</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Timeline</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEvents.map((event) => {
                      const now = new Date();
                      const start = new Date(event.startDate);
                      const end = new Date(event.endDate);
                      let statusBadge = null;

                      if (!event.isActive) {
                        statusBadge = <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Inactive</span>;
                      } else if (end < now) {
                        statusBadge = <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Ended</span>;
                      } else if (start > now) {
                        statusBadge = <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">Upcoming</span>;
                      } else {
                        statusBadge = <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live</span>;
                      }

                      return (
                        <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{event.name}</p>
                            {event.description && <p className="text-slate-500 text-[10px] mt-0.5 line-clamp-1">{event.description}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                              {event.eventType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            <div className="flex flex-col gap-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-slate-400 pl-4">to {end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {statusBadge}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(event)}
                                title={event.isActive ? 'Deactivate' : 'Activate'}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition"
                              >
                                {event.isActive ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditModal(event)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteId(event.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                {editing ? 'Edit Event' : 'Create Event'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Happy Hour, Jazz Night"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide some details..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type *</label>
                <select
                  value={formEventType}
                  onChange={(e) => setFormEventType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                >
                  <option value="PROMOTION">Promotion</option>
                  <option value="THEMED_NIGHT">Themed Night</option>
                  <option value="LIVE_MUSIC">Live Music</option>
                  <option value="SPECIAL_MENU">Special Menu</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700">Active</label>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    formIsActive ? 'bg-emerald-500' : 'bg-slate-300'
                  } relative`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      formIsActive ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Saving...' : editing ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Delete Event</h3>
            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-md hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

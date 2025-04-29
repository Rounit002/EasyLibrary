import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Calendar as CalendarIcon, Menu } from 'lucide-react';
import { toast } from 'sonner';
import api from '../services/api';

interface ScheduleEvent {
  id: number;
  title: string;
  createdAt: Date;
  description: string | null;
  time: string;
  eventDate: string;
}

const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString || !timeString.includes(':')) return 'N/A';
  const parts = timeString.split(':');
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return 'Invalid time';
  const date = new Date();
  date.setHours(hour);
  date.setMinutes(minute);
  date.setSeconds(0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(date);
};

const Schedule = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: selectedDate || new Date(),
    time: '',
    description: ''
  });

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getSchedules();
      if (!data || !Array.isArray(data.schedules)) {
        console.error('Unexpected response structure from api.getSchedules:', data);
        throw new Error('Invalid data structure received');
      }
      setEvents(data.schedules.map((event: any) => ({
        id: event.id,
        title: event.title,
        createdAt: new Date(event.created_at),
        description: event.description,
        time: event.time || '',
        eventDate: event.event_date,
      })));
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error(`Failed to load events: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!isAddEventOpen && selectedDate) {
      setNewEvent(prev => ({ ...prev, date: selectedDate }));
    }
  }, [selectedDate, isAddEventOpen]);

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.time) {
      toast.error('Please fill in Title and Time');
      return;
    }
    const eventDate = newEvent.date || new Date();
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const scheduleDataToSend = {
      title: newEvent.title,
      description: newEvent.description || null,
      time: newEvent.time,
      event_date: dateStr
    };
    setIsLoading(true);
    try {
      const data = await api.addSchedule(scheduleDataToSend);
      if (!data || !data.schedule || !data.schedule.id) {
        throw new Error('Invalid response received after adding event');
      }
      const addedEvent = {
        id: data.schedule.id,
        title: data.schedule.title,
        createdAt: new Date(data.schedule.created_at),
        description: data.schedule.description,
        time: data.schedule.time,
        eventDate: data.schedule.event_date
      };
      setEvents([...events, addedEvent]);
      setIsAddEventOpen(false);
      setNewEvent({ title: '', date: selectedDate || new Date(), time: '', description: '' });
      toast.success('Event added to schedule');
    } catch (error: any) {
      console.error('Error adding event:', error);
      toast.error(`Failed to add event: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (id: number | string) => {
    setIsLoading(true);
    try {
      const data = await api.deleteSchedule(String(id));
      setEvents(events.filter(event => event.id !== id));
      toast.success(data.message || 'Event removed from schedule');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error(`Failed to delete event: ${error instanceof Error ? error.message : 'Operation failed'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (!selectedDate) return true;
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const selectedStr = `${year}-${month}-${day}`;
    return event.eventDate === selectedStr;
  });

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md dark:bg-gray-800 dark:text-gray-200"
      >
        <Menu size={24} />
      </button>
      <div
        className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out z-40 w-64 bg-white dark:bg-gray-800 shadow-md`}
      >
        <Sidebar />
      </div>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Schedule</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage your daily activities and classes</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold dark:text-gray-200">Calendar</h3>
                    <Button
                      variant="outline"
                      size="default"
                      className="flex items-center gap-1 p-2"
                      onClick={() => {
                        setNewEvent({ title: '', date: selectedDate || new Date(), time: '', description: '' });
                        setIsAddEventOpen(true);
                      }}
                      disabled={isLoading}
                    >
                      <Plus size={16} />
                      Add Event
                    </Button>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="p-4"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-semibold dark:text-gray-200">
                      Events for {selectedDate ? new Intl.DateTimeFormat('en-US', {
                        month: 'long', day: 'numeric', year: 'numeric'
                      }).format(selectedDate) : 'All Dates'}
                    </h3>
                  </div>
                  {isLoading ? (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading events...</div>
                  ) : filteredEvents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead className="hidden md:table-cell">Description</TableHead>
                            <TableHead className="w-[80px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEvents.map((event) => (
                            <TableRow key={event.id}>
                              <TableCell className="font-medium">{event.title}</TableCell>
                              <TableCell>{formatTime(event.time)}</TableCell>
                              <TableCell className="hidden md:table-cell">{event.description || '-'}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 p-2 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"
                                  onClick={() => handleDeleteEvent(event.id)}
                                  disabled={isLoading}
                                >
                                  <span className="sr-only">Delete event</span>
                                  <Trash2 size={16} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No events scheduled for this date.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogDescription>Create a new event in your schedule for the selected date.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="title" className="text-sm font-medium">Event Title *</label>
              <Input
                id="title"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g., Library Meeting"
                required
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="date-display" className="text-sm font-medium">Date</label>
              <div id="date-display" className="flex items-center h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                {newEvent.date ? new Intl.DateTimeFormat('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric'
                }).format(newEvent.date) : 'No date selected'}
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="time" className="text-sm font-medium">Time *</label>
              <Input
                id="time"
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                required
                className="w-full"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Input
                id="description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Optional details about the event"
                className="w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsAddEventOpen(false)} disabled={isLoading} className="p-2">Cancel</Button>
            <Button onClick={handleAddEvent} disabled={isLoading} className="p-2">
              {isLoading ? 'Adding...' : 'Add Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;
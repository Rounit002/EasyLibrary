import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import api from '../services/api';
import { Search, ChevronLeft, ChevronRight, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { format, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Type guard to check if user has permissions
const hasPermissions = (user: any): user is { permissions: string[] } => {
  return user && 'permissions' in user && Array.isArray(user.permissions);
};

// Utility function to format date to YYYY-MM-DD
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toISOString().split('T')[0];
};

const ExpiredMemberships = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(addMonths(new Date(), 1));
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage, setStudentsPerPage] = useState(10);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.getStudents();
        const updatedStudents = response.students.map((student: any) => {
          const membershipEndDate = new Date(student.membershipEnd);
          const currentDate = new Date();
          const isExpired = membershipEndDate < currentDate;
          return {
            ...student,
            status: isExpired ? 'expired' : student.status,
          };
        });
        const expiredStudents = updatedStudents.filter((student: any) => student.status === 'expired');
        setStudents(expiredStudents);
        setLoading(false);
      } catch (error: any) {
        console.error('Failed to fetch expired students:', error.message);
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleRenewClick = (student: any) => {
    setSelectedStudent(student);
    setStartDate(new Date());
    setEndDate(addMonths(new Date(), 1));
    setRenewDialogOpen(true);
  };

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    if (date) {
      setEndDate(addMonths(date, 1));
    }
  };

  const handleRenewSubmit = async () => {
    if (selectedStudent && startDate && endDate) {
      try {
        await api.updateStudent(selectedStudent.id, {
          membership_end: format(endDate, 'yyyy-MM-dd'),
          status: 'active',
          membership_start: format(startDate, 'yyyy-MM-dd'),
        });
        toast.success(`Membership renewed for ${selectedStudent.name}`);
        setRenewDialogOpen(false);
        const response = await api.getStudents();
        const updatedStudents = response.students.map((student: any) => {
          const membershipEndDate = new Date(student.membershipEnd);
          const currentDate = new Date();
          const isExpired = membershipEndDate < currentDate;
          return { ...student, status: isExpired ? 'expired' : student.status };
        });
        const expiredStudents = updatedStudents.filter((student: any) => student.status === 'expired');
        setStudents(expiredStudents);
      } catch (error: any) {
        console.error('Failed to renew membership:', error.response ? error.response.data : error.message);
        toast.error('Failed to renew membership: ' + (error.response ? error.response.data.message : error.message));
      }
    } else {
      toast.error('Please ensure all fields are filled correctly');
    }
  };

  const filteredStudents = students.filter((student: any) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastStudent = currentPage * studentsPerPage;
  const indexOfFirstStudent = indexOfLastStudent - studentsPerPage;
  const currentStudents = filteredStudents.slice(indexOfFirstStudent, indexOfLastStudent);
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.deleteStudent(id);
        setStudents(students.filter((student: any) => student.id !== id));
        toast.success('Student deleted successfully');
      } catch (error: any) {
        console.error('Failed to delete student:', error.message);
        toast.error('Failed to delete student');
      }
    }
  };

  const handleViewDetails = (id: string) => {
    navigate(`/students/${id}`);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Expired Memberships</h1>
              <p className="text-gray-500">Manage all students with expired memberships</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
                <h3 className="text-lg font-medium">Expired Memberships List</h3>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-300"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center p-8">Loading expired memberships...</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden md:table-cell">Phone</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentStudents.map((student: any) => (
                          <TableRow key={student.id}>
                            <TableCell>{student.name}</TableCell>
                            <TableCell className="hidden md:table-cell">{student.phone}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                {formatDate(student.membershipEnd)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-4">
                                <button
                                  onClick={() => handleViewDetails(student.id)}
                                  className="p-2 bg-gray-50 rounded-md text-blue-600 hover:text-blue-800"
                                >
                                  <Eye size={18} />
                                </button>
                                { user?.role === 'admin' && (
                                  <button
                                    onClick={() => handleRenewClick(student)}
                                    className="p-2 bg-gray-50 rounded-md text-purple-600 hover:text-purple-800"
                                  >
                                    Renew
                                  </button>
                                )}
                                { (user?.role === 'admin' || (hasPermissions(user) && user.permissions.includes('manage_students'))) && (
                                  <button
                                    onClick={() => handleDelete(student.id)}
                                    className="p-2 bg-gray-50 rounded-md text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredStudents.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      No expired memberships found matching your search.
                    </div>
                  )}
                </>
              )}
              {!loading && filteredStudents.length > 0 && (
                <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-200 px-6 py-3 space-y-2 md:space-y-0">
                  <div className="flex items-center space-x-2">
                    <select
                      value={studentsPerPage}
                      onChange={(e) => {
                        setStudentsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="text-sm border rounded py-2 px-3"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-500">students per page</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    Showing {indexOfFirstStudent + 1} to {Math.min(indexOfLastStudent, filteredStudents.length)} of {filteredStudents.length} students
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Dialog open={renewDialogOpen} onOpenChange={setRenewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Membership</DialogTitle>
            <DialogDescription>
              {selectedStudent && `Renew membership for ${selectedStudent.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <div className="border rounded-md p-4">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={handleStartDateChange}
                  className="p-3 pointer-events-auto"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date (Automatically calculated)</label>
              <div className="flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm">
                {endDate && format(endDate, 'yyyy-MM-dd')}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenewSubmit}>Renew Membership</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpiredMemberships;
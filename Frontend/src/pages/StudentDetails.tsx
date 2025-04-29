import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { toast } from 'sonner';
import { Trash2, ArrowLeft } from 'lucide-react';

// Interface for student data with shift fields from schedule
interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  membershipStart: string;
  membershipEnd: string;
  shiftTitle?: string;
  shiftDescription?: string;
}

// Utility function to format date to YYYY-MM-DD
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toISOString().split('T')[0];
};

const StudentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const studentData = await api.getStudent(id!);
        if (!studentData) {
          throw new Error('Student data not found');
        }
        const membershipEndDate = new Date(studentData.membershipEnd);
        const currentDate = new Date();
        const isExpired = membershipEndDate < currentDate;
        setStudent({
          ...studentData,
          status: isExpired ? 'expired' : studentData.status,
        });
        setLoading(false);
      } catch (error: any) {
        console.error('Failed to fetch student:', error.message);
        toast.error('Failed to load student details');
        setLoading(false);
      }
    };

    fetchStudent();
  }, [id]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.deleteStudent(id!);
        toast.success('Student deleted successfully');
        navigate('/students');
      } catch (error: any) {
        console.error('Failed to delete student:', error.message);
        toast.error('Failed to delete student');
      }
    }
  };

  if (loading) return <div className="flex justify-center p-8">Loading student details...</div>;
  if (!student) return <div className="flex justify-center p-8">Student not found</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => navigate(-1)}
              className="mb-4 flex items-center text-purple-600 hover:text-purple-800"
            >
              <ArrowLeft size={16} className="mr-1" /> Back
            </button>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Student Details</h1>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Name</h2>
                    <p className="text-lg">{student.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Email</h2>
                    <p className="text-lg">{student.email || 'Unknown'}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Phone</h2>
                    <p className="text-lg">{student.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Status</h2>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {student.status === 'active' ? 'Active' : 'Expired'}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Membership Start</h2>
                    <p className="text-lg">{formatDate(student.membershipStart)}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Membership End</h2>
                    <p className="text-lg">{formatDate(student.membershipEnd)}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Assigned Shift</h2>
                    {student.shiftTitle ? (
                      <div>
                        <p className="text-lg font-semibold">{student.shiftTitle} at {student.shiftDescription}</p>
                        {/* <p className="text-sm text-gray-600">{student.shiftDescription || 'No description'}</p> */}
                      </div>
                    ) : (
                      <p className="text-lg">No shift assigned</p>
                    )}
                  </div>
                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={handleDelete}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Trash2 size={16} className="mr-2" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
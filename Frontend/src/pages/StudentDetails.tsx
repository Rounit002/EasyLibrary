import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../services/api';
import { toast } from 'sonner';
import { Trash2, ArrowLeft, Edit, Printer } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  status: string;
  membershipStart: string;
  membershipEnd: string;
  shiftTitle?: string;
  shiftDescription?: string;
  seatNumber?: string;
  fee?: number;
  profileImageUrl?: string;
}

const formatDate = (isoDate: string | undefined): string => {
  if (!isoDate) return 'N/A';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toISOString().split('T')[0];
};

const StudentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

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
          id: studentData.id,
          name: studentData.name,
          email: studentData.email,
          phone: studentData.phone,
          address: studentData.address,
          status: isExpired ? 'expired' : studentData.status,
          membershipStart: studentData.membershipStart,
          membershipEnd: studentData.membershipEnd,
          shiftTitle: studentData.shiftTitle,
          shiftDescription: studentData.shiftDescription,
          seatNumber: studentData.seatNumber,
          fee: studentData.fee,
          profileImageUrl: studentData.profileImageUrl,
        });
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch student:', err);
        setError(err.message === 'Server error' ? 'Failed to load student details due to a server error. Please try again later.' : err.message);
        toast.error(err.message === 'Server error' ? 'Server error occurred while fetching student details' : err.message);
        setStudent(null);
      } finally {
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

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = `
        <html>
          <head>
            <title>Student Details - SDM Boys Library</title>
            <style>
              @media print {
                body {
                  margin: 0;
                  padding: 20mm;
                  font-family: 'Helvetica', Arial, sans-serif;
                }
                .print-container {
                  width: 100%;
                  max-width: 800px;
                  margin: 0 auto;
                  color: #333;
                }
                .library-header {
                  background: linear-gradient(90deg, #ff8c00, #ff4500);
                  color: white;
                  padding: 20px;
                  text-align: center;
                  border-radius: 10px 10px 0 0;
                  position: relative;
                  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                }
                .library-header .logo-circle {
                  position: absolute;
                  left: 20px;
                  top: 50%;
                  transform: translateY(-50%);
                  background: white;
                  color: #ff4500;
                  width: 60px;
                  height: 60px;
                  border-radius: 50%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 24px;
                  font-weight: bold;
                }
                .library-header .library-name {
                  font-size: 28px;
                  font-weight: bold;
                  margin: 0;
                  text-transform: uppercase;
                  letter-spacing: 2px;
                }
                .library-header .identity-card {
                  position: absolute;
                  right: 20px;
                  top: 50%;
                  transform: translateY(-50%);
                  background: #1e90ff;
                  color: white;
                  padding: 5px 10px;
                  border-radius: 5px;
                  font-size: 14px;
                  font-weight: bold;
                }
                .library-header .contact {
                  font-size: 14px;
                  margin-top: 5px;
                  opacity: 0.9;
                  color: black;
                }
                .student-details {
                  border: 2px solid #ff4500;
                  border-top: none;
                  padding: 30px;
                  background: #fff;
                  border-radius: 0 0 10px 10px;
                  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                }
                .student-details h2 {
                  font-size: 22px;
                  color: #ff4500;
                  margin: 0 0 20px;
                  text-align: center;
                  border-bottom: 2px solid #ff4500;
                  padding-bottom: 10px;
                }
                .student-details p {
                  margin: 10px 0;
                  font-size: 16px;
                  display: flex;
                  justify-content: space-between;
                }
                .student-details p strong {
                  color: #333;
                  font-weight: 600;
                  width: 200px;
                }
                .student-details p span {
                  flex: 1;
                  color: #555;
                }
                .student-details img {
                  max-width: 150px;
                  margin-top: 20px;
                  border-radius: 5px;
                }
                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-container">${printContent}</div>
          </body>
        </html>
      `;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  if (loading) return <div className="flex justify-center p-8">Loading student details...</div>;
  if (error) return <div className="flex justify-center p-8 text-red-600">{error}</div>;
  if (!student) return <div className="flex justify-center p-8">Student not found</div>;

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
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
                  {student.profileImageUrl && (
                    <div>
                      <h2 className="text-sm font-medium text-gray-500">Profile Image</h2>
                      <img
                        src={student.profileImageUrl}
                        alt={`${student.name}'s profile`}
                        className="max-w-xs rounded mt-2"
                      />
                    </div>
                  )}
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
                    <h2 className="text-sm font-medium text-gray-500">Address</h2>
                    <p className="text-lg">{student.address || 'N/A'}</p>
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
                      <p className="text-lg font-semibold">{student.shiftTitle} at {student.shiftDescription}</p>
                    ) : (
                      <p className="text-lg">No shift assigned</p>
                    )}
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Seat Number</h2>
                    <p className="text-lg">{student.seatNumber || 'None'}</p>
                  </div>
                  <div>
                    <h2 className="text-sm font-medium text-gray-500">Fee</h2>
                    <p className="text-lg">
                      {student.fee !== undefined && student.fee !== null ? `Rs. ${student.fee.toFixed(2)}` : 'N/A'}
                    </p>
                  </div>
                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={() => navigate(`/students/${id}/edit`)}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Edit size={16} className="mr-2" /> Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Trash2 size={16} className="mr-2" /> Delete
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      <Printer size={16} className="mr-2" /> Print
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div ref={printRef} className="hidden">
        <div className="library-header">
          <div className="logo-circle">SDM</div>
          <h1 className="library-name">SDM Boys Library</h1>
          <div className="identity-card">Identity Card</div>
          <p className="contact">Mob.: 9798643123</p>
        </div>
        <div className="student-details">
          {student.profileImageUrl && (
            <img src={student.profileImageUrl} alt={`${student.name}'s profile`} />
          )}
          <h2>Student Details</h2>
          <p><strong>Name:</strong> <span>{student?.name || 'Unknown'}</span></p>
          <p><strong>Email:</strong> <span>{student?.email || 'Unknown'}</span></p>
          <p><strong>Phone:</strong> <span>{student?.phone || 'N/A'}</span></p>
          <p><strong>Address:</strong> <span>{student?.address || 'N/A'}</span></p>
          <p><strong>Status:</strong> <span>{student?.status === 'active' ? 'Active' : 'Expired'}</span></p>
          <p><strong>Membership Start:</strong> <span>{formatDate(student?.membershipStart)}</span></p>
          <p><strong>Membership End:</strong> <span>{formatDate(student?.membershipEnd)}</span></p>
          <p><strong>Assigned Shift:</strong> <span>{student?.shiftTitle ? `${student.shiftTitle} at ${student.shiftDescription}` : 'No shift assigned'}</span></p>
          <p><strong>Seat Number:</strong> <span>{student?.seatNumber || 'None'}</span></p>
          <p><strong>Fee:</strong> <span>{student?.fee !== undefined && student?.fee !== null ? `Rs. ${student.fee.toFixed(2)}` : 'N/A'}</span></p>
        </div>
      </div>
    </div>
  );
};

export default StudentDetails;
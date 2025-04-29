import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, Users, UserCheck, AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import StudentList from '../components/StudentList';
import AddStudentForm from '../components/AddStudentForm';
import ExpiringMemberships from '../components/ExpiringMemberships';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBgColor: string;
  arrowIcon: React.ReactNode;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [updateList, setUpdateList] = useState(false);
  const [stats, setStats] = useState({ totalStudents: 0, activeStudents: 0, expiredMemberships: 0 });
  const [showAddForm, setShowAddForm] = useState(false);

  const handleStudentAdded = () => {
    setUpdateList(prev => !prev);
    setShowAddForm(false);
    fetchStats();
  };

  const fetchStats = async () => {
    try {
      const response = await api.getStudents();
      const allStudents = response.students;
      setStats({
        totalStudents: allStudents.length,
        activeStudents: allStudents.filter((student: any) => new Date(student.membershipEnd) >= new Date() && student.status === 'active').length,
        expiredMemberships: allStudents.filter((student: any) => new Date(student.membershipEnd) < new Date()).length,
      });
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
        navigate('/login');
      } else {
        toast.error('Failed to load dashboard stats');
        console.error('Error fetching stats:', error);
      }
    }
  };

  useEffect(() => {
    fetchStats();
  }, [updateList, navigate, user?.role]);

  // Allow both admin and staff to manage students
  const canManageStudents = user?.role === 'admin' || user?.role === 'staff';

  return (
    <div className="flex h-screen bg-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Link to="/students" className="block">
                <StatCard
                  title="Total Students"
                  value={stats.totalStudents}
                  icon={<Users className="h-6 w-6 text-purple-500" />}
                  iconBgColor="bg-purple-100"
                  arrowIcon={<ChevronRight className="h-5 w-5 text-purple-400" />}
                />
              </Link>
              <Link to="/active-students" className="block">
                <StatCard
                  title="Active Students"
                  value={stats.activeStudents}
                  icon={<UserCheck className="h-6 w-6 text-blue-500" />}
                  iconBgColor="bg-blue-100"
                  arrowIcon={<ChevronRight className="h-5 w-5 text-blue-400" />}
                />
              </Link>
              <Link to="/expired-memberships" className="block">
                <StatCard
                  title="Expired Memberships"
                  value={stats.expiredMemberships}
                  icon={<AlertTriangle className="h-6 w-6 text-orange-500" />}
                  iconBgColor="bg-orange-100"
                  arrowIcon={<ChevronRight className="h-5 w-5 text-orange-400" />}
                />
              </Link>
            </div>
            {canManageStudents && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Manage Students</h2>
                  {!showAddForm ? (
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition duration-200"
                    >
                      Add Student
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition duration-200"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {showAddForm && <AddStudentForm onStudentAdded={handleStudentAdded} />}
                <StudentList key={String(updateList)} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold mb-4">Expiring Soon</h2>
              <ExpiringMemberships />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

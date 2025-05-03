import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../services/api';
import Select from 'react-select';

const EditStudentForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    membershipStart: '',
    membershipEnd: '',
    shiftId: '',
    seatId: null as number | null,
    fee: '',
  });
  const [shifts, setShifts] = useState<any[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentAndShifts = async () => {
      try {
        const [studentResponse, shiftsResponse] = await Promise.all([
          api.getStudent(id!),
          api.getSchedules(),
        ]);
        setFormData({
          name: studentResponse.name || '',
          email: studentResponse.email || '',
          phone: studentResponse.phone || '',
          membershipStart: studentResponse.membershipStart || '',
          membershipEnd: studentResponse.membershipEnd || '',
          shiftId: studentResponse.shiftId || '',
          seatId: studentResponse.seatId || null,
          fee: studentResponse.fee ? studentResponse.fee.toString() : '',
        });
        setShifts(shiftsResponse.schedules);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load student or shifts');
      } finally {
        setLoading(false);
      }
    };
    fetchStudentAndShifts();
  }, [id]);

  useEffect(() => {
    const fetchSeats = async () => {
      if (formData.shiftId) {
        setLoadingSeats(true);
        try {
          const seatsResponse = await api.getSeats(formData.shiftId);
          const currentSeat = seatsResponse.seats.find((seat: any) => seat.id === formData.seatId);
          const availableSeats = seatsResponse.seats.filter((seat: any) => !seat.isAssigned || seat.id === formData.seatId);
          setSeats(availableSeats);
        } catch (error) {
          console.error('Failed to fetch seats:', error);
          toast.error('Failed to load seats');
        } finally {
          setLoadingSeats(false);
        }
      } else {
        setSeats([]);
      }
    };
    fetchSeats();
  }, [formData.shiftId, formData.seatId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const availableSeats = seats.filter((seat: any) => !seat.isAssigned || seat.id === formData.seatId);
  const seatOptions = [
    { value: null, label: 'None' },
    ...availableSeats.map((seat: any) => ({ value: seat.id, label: seat.seatNumber })),
  ];

  const handleSubmit = async () => {
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    try {
      const response = await api.updateStudent(id!, {
        ...formData,
        seatId: formData.seatId,
        fee: formData.fee ? parseFloat(formData.fee) : null,
      });
      toast.success('Student updated successfully');
      navigate('/students');
    } catch (error: any) {
      console.error('Failed to update student:', error);
      toast.error(error.message || 'Failed to update student');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Student</h1>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label htmlFor="membershipStart" className="block text-sm font-medium text-gray-700 mb-1">
            Membership Start
          </label>
          <input
            type="date"
            id="membershipStart"
            name="membershipStart"
            value={formData.membershipStart}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label htmlFor="membershipEnd" className="block text-sm font-medium text-gray-700 mb-1">
            Membership End
          </label>
          <input
            type="date"
            id="membershipEnd"
            name="membershipEnd"
            value={formData.membershipEnd}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <div>
          <label htmlFor="shiftId" className="block text-sm font-medium text-gray-700 mb-1">
            Select Shift
          </label>
          <select
            id="shiftId"
            name="shiftId"
            value={formData.shiftId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
          >
            <option value="">-- Select Shift --</option>
            {shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>
                {shift.title} at {shift.description}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="seatId" className="block text-sm font-medium text-gray-700 mb-1">
            Select Seat
          </label>
          {loadingSeats ? (
            <div>Loading seats...</div>
          ) : (
            <Select
              id="seatId"
              name="seatId"
              options={seatOptions}
              value={seatOptions.find((option) => option.value === formData.seatId)}
              onChange={(selected) =>
                setFormData((prev) => ({ ...prev, seatId: selected ? selected.value : null }))
              }
              isSearchable
              placeholder="Select a seat or None"
              className="w-full"
            />
          )}
        </div>
        <div>
          <label htmlFor="fee" className="block text-sm font-medium text-gray-700 mb-1">
            Fee
          </label>
          <input
            type="number"
            id="fee"
            name="fee"
            value={formData.fee}
            onChange={handleChange}
            step="0.01"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
          />
        </div>
        <button
          onClick={handleSubmit}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition duration-200"
        >
          Update Student
        </button>
      </div>
    </div>
  );
};

export default EditStudentForm;
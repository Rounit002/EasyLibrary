import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { deleteSeat } from '../services/api'; // Explicitly import deleteSeat if needed
import { toast } from 'sonner';
import { Trash2, ArrowLeft } from 'lucide-react';

interface Seat {
  id: string;
  seatNumber: string;
  isAssigned: boolean;
}

const SeatsPage = () => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSeatNumbers, setNewSeatNumbers] = useState('');
  const navigate = useNavigate();

  const fetchSeats = async (retryCount = 0) => {
    const maxRetries = 2;
    try {
      const response = await api.getSeats();
      if (response.seats && Array.isArray(response.seats)) {
        setSeats(response.seats.sort((a, b) => parseInt(a.seatNumber) - parseInt(b.seatNumber)));
        setError(null);
      } else {
        throw new Error('Invalid data format from API');
      }
    } catch (err: any) {
      console.error('Error fetching seats:', err);
      setError('Failed to fetch seats. Please try again.');
      if (retryCount < maxRetries) {
        console.log(`Retrying fetch... Attempt ${retryCount + 2}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        await fetchSeats(retryCount + 1);
      } else {
        toast.error('Failed to fetch seats after multiple attempts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSeats = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.addSeats({ seatNumbers: newSeatNumbers });
      toast.success(response.message || 'Seats added successfully');
      setNewSeatNumbers(''); // Clear input after success
      await fetchSeats(); // Refresh the seat list
    } catch (err: any) {
      console.error('Error adding seats:', err);
      toast.error(err.response?.data?.message || 'Failed to add seats');
    }
  };

  const handleDeleteSeat = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this seat?')) {
      try {
        const response = await (api as any).deleteSeat(id); // Type assertion to bypass strict typing temporarily
        toast.success(response.message || 'Seat deleted successfully');
        await fetchSeats(); // Refresh the seat list
      } catch (err: any) {
        console.error('Error deleting seat:', err);
        toast.error(err.response?.data?.message || 'Failed to delete seat');
      }
    }
  };

  useEffect(() => {
    fetchSeats();
  }, []);

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Seat Assignments</h1>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center text-purple-600 hover:text-purple-800"
      >
        <ArrowLeft size={16} className="mr-1" /> Back
      </button>
      {error ? (
        <div className="text-red-500 mb-4">{error}</div>
      ) : seats.length === 0 ? (
        <div>No seats available</div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {seats.map((seat) =>
            seat.id && seat.seatNumber ? (
              <div
                key={seat.id}
                className={`p-2 border rounded flex justify-between items-center ${
                  seat.isAssigned ? 'bg-red-200' : 'bg-green-200'
                }`}
              >
                <span>Seat {seat.seatNumber} - {seat.isAssigned ? 'Assigned' : 'Available'}</span>
                <button
                  onClick={() => handleDeleteSeat(seat.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ) : null
          )}
        </div>
      )}
      <form onSubmit={handleAddSeats} className="mb-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newSeatNumbers}
            onChange={(e) => setNewSeatNumbers(e.target.value)}
            placeholder="Enter seat numbers (e.g., 1,2,3)"
            className="border p-2 rounded w-full"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Seats
          </button>
        </div>
      </form>
    </div>
  );
};

export default SeatsPage;
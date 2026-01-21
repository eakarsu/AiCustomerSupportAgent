import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag as TagIcon, Ticket } from 'lucide-react';
import { tagsApi } from '../services/api';

function TagDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tag, setTag] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const data = await tagsApi.getById(id);
      setTag(data);
    } catch (error) {
      console.error('Failed to load tag:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Tag not found</p>
        <button onClick={() => navigate('/tags')} className="btn-primary mt-4">
          Back to Tags
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate('/tags')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Tags
      </button>

      <div className="grid grid-cols-3 gap-8">
        {/* Tag Info */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="text-center mb-6">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${tag.color}20` }}
              >
                <TagIcon className="w-8 h-8" style={{ color: tag.color }} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">{tag.name}</h2>
              <div
                className="w-4 h-4 rounded-full mx-auto mt-2"
                style={{ backgroundColor: tag.color }}
              ></div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: tag.color }}>
                {tag._count?.tickets || 0}
              </p>
              <p className="text-sm text-gray-500">Tagged Tickets</p>
            </div>
          </div>
        </div>

        {/* Tagged Tickets */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                Tagged Tickets
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {tag.tickets && tag.tickets.length > 0 ? (
                tag.tickets.map((item) => (
                  <div
                    key={item.ticket.id}
                    onClick={() => navigate(`/tickets/${item.ticket.id}`)}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{item.ticket.subject}</p>
                        <p className="text-sm text-gray-500">
                          {item.ticket.customer?.name} - {formatDate(item.ticket.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.ticket.category && (
                          <span
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${item.ticket.category.color}20`,
                              color: item.ticket.category.color
                            }}
                          >
                            {item.ticket.category.name}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium status-${item.ticket.status}`}>
                          {item.ticket.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No tickets with this tag
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TagDetail;

'use client';

import { useState } from 'react';

export default function Home() {
  const [orders, setOrders] = useState<Array<{
    id: string;
    drinkType: string;
    sugarCount: number;
    quantity: number;
    notes?: string;
  }>>([]);

  const [drinkType, setDrinkType] = useState('çay');
  const [sugarCount, setSugarCount] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newOrder = {
      id: Date.now().toString(),
      drinkType,
      sugarCount,
      quantity,
      notes: notes.trim() || undefined
    };

    setOrders([...orders, newOrder]);
    
    // Form alanlarını sıfırla
    setDrinkType('çay');
    setSugarCount(1);
    setQuantity(1);
    setNotes('');
  };

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <h1 className="text-3xl font-bold text-center mb-8">Çay/Kahve Siparişi</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">İçecek:</label>
            <select 
              value={drinkType}
              onChange={(e) => setDrinkType(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="çay">Çay</option>
              <option value="kahve">Kahve</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şeker Sayısı:</label>
            <input
              type="number"
              min="0"
              max="5"
              value={sugarCount}
              onChange={(e) => setSugarCount(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adet:</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Not:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Ör: Az şekerli, köpüklü vb."
              rows={2}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Sipariş Ver
          </button>
        </form>
      </div>

      {orders.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Siparişler</h2>
          <div className="space-y-4">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="border p-4 rounded bg-gray-50"
              >
                <p className="mb-1"><span className="font-medium">İçecek:</span> {order.drinkType}</p>
                <p className="mb-1"><span className="font-medium">Şeker:</span> {order.sugarCount}</p>
                <p className="mb-1"><span className="font-medium">Adet:</span> {order.quantity}</p>
                {order.notes && <p><span className="font-medium">Not:</span> {order.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 
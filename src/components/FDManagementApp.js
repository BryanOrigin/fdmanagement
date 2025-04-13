import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, RefreshCw } from 'lucide-react';

export default function SimpleFDManagementApp() {
  const [fds, setFds] = useState(() => {
    const savedFds = localStorage.getItem('fixedDeposits');
    return savedFds ? JSON.parse(savedFds) : [];
  });
  
  const [formData, setFormData] = useState({
    accountNumber: '',
    holderName: '',
    bankName: '',
    principleAmount: '',
    interestRate: '',
    dueDate: '',
    duration: '',
    durationType: 'years', // Default to years
    startDate: '', // Will be calculated
  });
  
  const [editIndex, setEditIndex] = useState(null);
  
  // Save data to localStorage whenever fds changes
  useEffect(() => {
    localStorage.setItem('fixedDeposits', JSON.stringify(fds));
  }, [fds]);
  
  // Calculate start date when due date or duration changes
  useEffect(() => {
    if (formData.dueDate && formData.duration) {
      calculateStartDate();
    }
  }, [formData.dueDate, formData.duration, formData.durationType]);
  
  const calculateStartDate = () => {
    try {
      const dueDate = new Date(formData.dueDate);
      let startDate = new Date(dueDate);
      
      if (formData.durationType === 'years') {
        startDate.setFullYear(dueDate.getFullYear() - parseInt(formData.duration));
      } else {
        // For days
        startDate.setDate(dueDate.getDate() - parseInt(formData.duration));
      }
      
      // Format to YYYY-MM-DD for input field
      const formattedStartDate = startDate.toISOString().split('T')[0];
      
      setFormData(prev => ({
        ...prev,
        startDate: formattedStartDate
      }));
    } catch (error) {
      console.error("Error calculating date:", error);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newFd = {
      ...formData,
      id: editIndex !== null ? fds[editIndex].id : Date.now()
    };
    
    if (editIndex !== null) {
      // Update existing FD
      const updatedFds = [...fds];
      updatedFds[editIndex] = newFd;
      setFds(updatedFds);
      setEditIndex(null);
    } else {
      // Add new FD
      setFds([...fds, newFd]);
    }
    
    // Reset form
    setFormData({
      accountNumber: '',
      holderName: '',
      bankName: '',
      principleAmount: '',
      interestRate: '',
      dueDate: '',
      duration: '',
      durationType: 'years',
      startDate: '',
    });
  };
  
  const handleEdit = (index) => {
    const fdToEdit = fds[index];
    setFormData(fdToEdit);
    setEditIndex(index);
  };
  
  const handleDelete = (index) => {
    const updatedFds = fds.filter((_, i) => i !== index);
    setFds(updatedFds);
  };
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Fixed Deposit Management System</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">{editIndex !== null ? 'Edit Fixed Deposit' : 'Add New Fixed Deposit'}</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Bank Name</label>
              <input
                type="text"
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Holder Name</label>
              <input
                type="text"
                name="holderName"
                value={formData.holderName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Principal Amount</label>
              <input
                type="number"
                name="principleAmount"
                value={formData.principleAmount}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
              <input
                type="number"
                name="interestRate"
                value={formData.interestRate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Due Date / Renewal Date</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Term / Duration</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                  min="1"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select
                  name="durationType"
                  value={formData.durationType}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded h-10"
                >
                  <option value="years">Years</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Start Date (Calculated)</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                className="w-full p-2 border rounded bg-gray-100"
                disabled
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            {editIndex !== null ? (
              <>
                <RefreshCw size={18} /> Update Fixed Deposit
              </>
            ) : (
              <>
                <Plus size={18} /> Add Fixed Deposit
              </>
            )}
          </button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
  <h2 className="text-xl font-semibold mb-4">Fixed Deposits</h2>
  
  {fds.length === 0 ? (
    <p className="text-center text-gray-500 py-4">No fixed deposits found. Add your first FD above.</p>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {fds.map((fd, index) => {
        // Calculate maturity amount
        const principal = parseFloat(fd.principleAmount);
        const rate = parseFloat(fd.interestRate);
        let interestAmount = 0;
        
        if (fd.durationType === 'years') {
          interestAmount = principal * (rate / 100) * parseInt(fd.duration);
        } else {
          // Convert days to years for calculation
          interestAmount = principal * (rate / 100) * (parseInt(fd.duration) / 365);
        }
        
        const maturityAmount = principal + interestAmount;
        
        // Calculate days remaining
        const today = new Date();
        const dueDate = new Date(fd.dueDate);
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return (
          <div key={fd.id} className="bg-gray-50 rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="bg-blue-600 text-white p-3 flex justify-between items-center">
              <div className="font-medium">{fd.bankName}</div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleEdit(index)}
                  className="text-white hover:text-blue-200"
                >
                  <Edit size={16} />
                </button>
                <button 
                  onClick={() => handleDelete(index)}
                  className="text-white hover:text-blue-200"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <div className="text-sm text-gray-500">Account Number</div>
                <div className="font-medium">{fd.accountNumber}</div>
              </div>
              
              <div className="mb-4">
                <div className="text-sm text-gray-500">Holder Name</div>
                <div className="font-medium">{fd.holderName}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Principal</div>
                  <div className="font-medium">{parseFloat(fd.principleAmount).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Interest Rate</div>
                  <div className="font-medium">{fd.interestRate}%</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Start Date</div>
                  <div className="font-medium">{new Date(fd.startDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Due Date</div>
                  <div className="font-medium">{new Date(fd.dueDate).toLocaleDateString()}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <div className="text-sm text-gray-500">Term</div>
                  <div className="font-medium">{fd.duration} {fd.durationType}</div>
                </div>
              </div>
              
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-gray-500">Interest Earned</div>
                  <div className="font-medium text-green-600">{interestAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm text-gray-500">Maturity Amount</div>
                  <div className="font-medium text-green-700">{maturityAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
                </div>
              </div>
            </div>
            
            <div className={`p-2 text-center text-sm font-medium ${daysRemaining <= 30 ? 'bg-red-100 text-red-700' : daysRemaining <= 90 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
              {daysRemaining <= 0 ? 'Matured' : `${daysRemaining} days remaining`}
            </div>
          </div>
        );
      })}
    </div>
  )}
</div>
    </div>
  );
}

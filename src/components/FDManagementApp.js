import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, RefreshCw } from 'lucide-react';

export default function SimpleFDManagementApp() {
  const [fds, setFds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
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
  
  const [editIndex, setEditIndex] = useState(null);
  
  // GitHub configuration
  const GITHUB_USERNAME = process.env.REACT_APP_GITHUB_USERNAME;
  const REPO_NAME = process.env.REACT_APP_GITHUB_REPO;
  const GITHUB_TOKEN = process.env.REACT_APP_GITHUB_TOKEN;
  const FILE_PATH = 'fixed-deposits.json';

  // Fetch data from GitHub
  const fetchDataFromGitHub = async () => {
    try {
      console.log(GITHUB_USERNAME,GITHUB_TOKEN,REACT_APP_GITHUB_REPO);
      setIsLoading(true);
      // First get the SHA of the file if it exists
      const response = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (response.status === 404) {
        // File doesn't exist yet
        setFds([]);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      // Decode the base64 content
      const content = JSON.parse(atob(data.content));
      setFds(content);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data from GitHub:', error);
      setError('Failed to load data. Please check your GitHub configuration.');
      setIsLoading(false);
      // Fallback to localStorage if GitHub fails
      const savedFds = localStorage.getItem('fixedDeposits');
      if (savedFds) {
        setFds(JSON.parse(savedFds));
      }
    }
  };

  // Save data to GitHub
  const saveDataToGitHub = async (updatedFds) => {
    try {
      setIsSaving(true);
      
      // First get the SHA of the file if it exists (needed for updating)
      const getFileResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
      
      let sha;
      if (getFileResponse.ok) {
        const fileData = await getFileResponse.json();
        sha = fileData.sha;
      }
      
      // Prepare the file content
      const content = btoa(JSON.stringify(updatedFds, null, 2));
      
      // Create or update the file
      const updateResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${REPO_NAME}/contents/${FILE_PATH}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'Update fixed deposits data',
            content,
            sha: sha, // Include the SHA if updating an existing file
          }),
        }
      );
      
      if (!updateResponse.ok) {
        throw new Error('Failed to save data to GitHub');
      }
      
      // Also save to localStorage as backup
      localStorage.setItem('fixedDeposits', JSON.stringify(updatedFds));
      setIsSaving(false);
    } catch (error) {
      console.error('Error saving data to GitHub:', error);
      setError('Failed to save data to GitHub. Changes saved locally.');
      // Still save to localStorage as backup
      localStorage.setItem('fixedDeposits', JSON.stringify(updatedFds));
      setIsSaving(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchDataFromGitHub();
  }, []);

  // Effect to handle start date calculation
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
      
      // Format to YYYY-MM-DD
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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const newFd = {
      ...formData,
      id: editIndex !== null ? fds[editIndex].id : Date.now()
    };
    
    let updatedFds;
    if (editIndex !== null) {
      updatedFds = [...fds];
      updatedFds[editIndex] = newFd;
    } else {
      updatedFds = [...fds, newFd];
    }
    
    setFds(updatedFds); // Update local state
    await saveDataToGitHub(updatedFds); // Save to GitHub
    
    // Reset form and edit state
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
    setEditIndex(null);
  };
  
  const handleEdit = (index) => {
    const fdToEdit = fds[index];
    setFormData(fdToEdit);
    setEditIndex(index);
  };
  
  const handleDelete = async (index) => {
    const updatedFds = fds.filter((_, i) => i !== index);
    setFds(updatedFds); // Update local state
    await saveDataToGitHub(updatedFds); // Save to GitHub
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your fixed deposits...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8 p-4 bg-red-50 border border-red-200 rounded-md">
        <h2 className="text-red-700 font-semibold mb-2">Error</h2>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => setError(null)} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Dismiss
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">Fixed Deposit Management System</h1>
      
      {!GITHUB_TOKEN && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          <strong>Warning:</strong> GitHub token not configured. Data will only be saved locally.
        </div>
      )}
      
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
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : editIndex !== null ? (
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
                        disabled={isSaving}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(index)}
                        className="text-white hover:text-blue-200"
                        disabled={isSaving}
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
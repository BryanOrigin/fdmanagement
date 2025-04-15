import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, RefreshCw, Download, Upload, ChevronDown, Eye, Filter, SortAsc, SortDesc, Bell } from 'lucide-react';

export default function EnhancedFDManagementApp() {
  const [fds, setFds] = useState(() => {
    const savedFds = localStorage.getItem('fixedDeposits');
    return savedFds ? JSON.parse(savedFds) : [];
  });
  
  // Common banks list
  const commonBanks = [
    "State Bank of India",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Bank of Baroda",
    "Punjab National Bank",
    "Canara Bank",
    "Union Bank of India",
    "Other"
  ];
  
  const [formData, setFormData] = useState({
    accountNumber: '',
    holderName: '',
    bankName: '',
    customBankName: '',
    principleAmount: '',
    interestRate: '',
    dueDate: '',
    duration: '',
    durationType: 'years', // Default to years
    startDate: '', // Will be calculated
  });
  
  const [editIndex, setEditIndex] = useState(null);
  const [showCustomBank, setShowCustomBank] = useState(false);
  const [viewInterestBreakdown, setViewInterestBreakdown] = useState(null);
  
  // New states for filtering and sorting
  const [filterBy, setFilterBy] = useState({
    bank: '',
    maturityTimeframe: 'all', // 'all', 'soon' (30 days), 'medium' (90 days), 'long' (>90 days)
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'dueDate', // Default sort by due date
    direction: 'asc',
  });
  const [showStats, setShowStats] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  
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
  
  // Function to calculate interest breakdown for all intervals
  const calculateInterestBreakdown = (fd) => {
    try {
      const principal = parseFloat(fd.principleAmount);
      const annualRate = parseFloat(fd.interestRate) / 100;
      const startDate = new Date(fd.startDate);
      
      // Convert duration to days
      let totalDays = 0;
      if (fd.durationType === 'years') {
        totalDays = parseInt(fd.duration) * 365;
      } else {
        totalDays = parseInt(fd.duration);
      }
      
      // Define all intervals we want to calculate (in days)
      const intervals = [
        { name: "Quarterly", days: 90 },
        { name: "Half-Yearly", days: 180 },
        { name: "Yearly", days: 365 }
      ];
      
      const breakdowns = {};
      
      // Calculate for each interval type
      intervals.forEach(interval => {
        const intervalBreakdown = [];
        let currentDate = new Date(startDate);
        let remainingDays = totalDays;
        let cumulativeInterest = 0;
        
        while (remainingDays > 0) {
          // Determine days for this period (cap at remaining days)
          const periodDays = Math.min(interval.days, remainingDays);
          remainingDays -= periodDays;
          
          // Calculate interest for this period
          const periodInterest = principal * annualRate * (periodDays / 365);
          cumulativeInterest += periodInterest;
          
          // Add days to current date for this interval
          currentDate.setDate(currentDate.getDate() + periodDays);
          
          intervalBreakdown.push({
            date: new Date(currentDate).toISOString().split('T')[0],
            formattedDate: new Date(currentDate).toLocaleDateString(),
            periodInterest: periodInterest.toFixed(2),
            cumulativeInterest: cumulativeInterest.toFixed(2),
            projectedTotal: (principal + cumulativeInterest).toFixed(2)
          });
        }
        
        breakdowns[interval.name.toLowerCase()] = intervalBreakdown;
      });
      
      return breakdowns;
    } catch (error) {
      console.error("Error calculating interest breakdown:", error);
      return {};
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'bankName') {
      if (value === 'Other') {
        setShowCustomBank(true);
      } else {
        setShowCustomBank(false);
      }
    }
    
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Use custom bank name if selected "Other"
    const bankNameToUse = formData.bankName === 'Other' ? formData.customBankName : formData.bankName;
    
    const newFd = {
      ...formData,
      bankName: bankNameToUse,
      id: editIndex !== null ? fds[editIndex].id : Date.now(),
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
      customBankName: '',
      principleAmount: '',
      interestRate: '',
      dueDate: '',
      duration: '',
      durationType: 'years',
      startDate: '',
    });
    setShowCustomBank(false);
  };
  
  const handleEdit = (index) => {
    const fdToEdit = fds[index];
    
    // Set showCustomBank if the bank is not in the common list
    const isCustomBank = !commonBanks.includes(fdToEdit.bankName) && fdToEdit.bankName !== '';
    setShowCustomBank(isCustomBank);
    
    setFormData({
      ...fdToEdit,
      bankName: isCustomBank ? 'Other' : fdToEdit.bankName,
      customBankName: isCustomBank ? fdToEdit.bankName : '',
    });
    
    setEditIndex(index);
    
    // Close interest breakdown view if open
    setViewInterestBreakdown(null);
    
    // Scroll to the form
    document.querySelector('.fd-form-container').scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleDelete = (index) => {
    if (window.confirm('Are you sure you want to delete this fixed deposit?')) {
      const updatedFds = fds.filter((_, i) => i !== index);
      setFds(updatedFds);
      
      // Close interest breakdown view if it's the deleted one
      if (viewInterestBreakdown && viewInterestBreakdown.index === index) {
        setViewInterestBreakdown(null);
      }
    }
  };
  
  // Show interest breakdown when View button is clicked
  const toggleInterestBreakdown = (index) => {
    if (viewInterestBreakdown && viewInterestBreakdown.index === index) {
      // If already viewing this FD, close it
      setViewInterestBreakdown(null);
    } else {
      // Calculate the breakdown for this FD
      const fd = fds[index];
      const breakdowns = calculateInterestBreakdown(fd);
      
      setViewInterestBreakdown({
        index,
        breakdowns,
        activeInterval: 'quarterly' // Default to quarterly view
      });
      
      // Scroll to the breakdown after render
      setTimeout(() => {
        const element = document.getElementById(`breakdown-${index}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };
  
  // Export FD data to a JSON file
  const exportData = () => {
    try {
      const dataStr = JSON.stringify(fds, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `fd-data-${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data. Please try again.");
    }
  };
  
  // Import FD data from a JSON file
  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        if (Array.isArray(importedData)) {
          // Option to merge or replace current data
          if (fds.length > 0 && window.confirm("Do you want to merge with existing data? Click OK to merge or Cancel to replace.")) {
            // Merge: Combine arrays and remove duplicates based on ID
            const mergedData = [...fds];
            
            importedData.forEach(importedFd => {
              const existingIndex = mergedData.findIndex(fd => fd.id === importedFd.id);
              if (existingIndex >= 0) {
                mergedData[existingIndex] = importedFd; // Replace existing with imported
              } else {
                mergedData.push(importedFd); // Add new FD
              }
            });
            
            setFds(mergedData);
          } else {
            // Replace: Just use imported data
            setFds(importedData);
          }
          
          alert("Data imported successfully!");
        } else {
          alert("Invalid data format. Please select a valid FD data file.");
        }
      } catch (error) {
        console.error("Error importing data:", error);
        alert("Failed to import data. Please check if the file is valid JSON.");
      }
    };
    
    reader.readAsText(file);
    // Reset the file input
    e.target.value = '';
  };
  
  // New functions for sorting and filtering
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const handleFilter = (e) => {
    const { name, value } = e.target;
    setFilterBy(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Get filtered and sorted FDs
  const getFilteredAndSortedFDs = () => {
    // First filter
    let filtered = [...fds];
    
    if (filterBy.bank) {
      filtered = filtered.filter(fd => fd.bankName === filterBy.bank);
    }
    
    if (filterBy.maturityTimeframe !== 'all') {
      const today = new Date();
      filtered = filtered.filter(fd => {
        const dueDate = new Date(fd.dueDate);
        const timeDiff = dueDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (filterBy.maturityTimeframe === 'soon') {
          return daysRemaining <= 30;
        } else if (filterBy.maturityTimeframe === 'medium') {
          return daysRemaining > 30 && daysRemaining <= 90;
        } else if (filterBy.maturityTimeframe === 'long') {
          return daysRemaining > 90;
        }
        return true;
      });
    }
    
    // Then sort
    filtered.sort((a, b) => {
      // Determine which values to compare based on sortConfig.key
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'principleAmount':
        case 'interestRate':
          aValue = parseFloat(a[sortConfig.key]);
          bValue = parseFloat(b[sortConfig.key]);
          break;
        case 'dueDate':
        case 'startDate':
          aValue = new Date(a[sortConfig.key]).getTime();
          bValue = new Date(b[sortConfig.key]).getTime();
          break;
        default:
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
      }
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  };
  
  // Calculate summary statistics
  const calculateSummaryStats = () => {
    if (fds.length === 0) return null;
    
    let totalPrincipal = 0;
    let totalInterest = 0;
    let soon = 0; // Maturing in <= 30 days
    let medium = 0; // Maturing in 31-90 days
    let long = 0; // Maturing in > 90 days
    let matured = 0; // Already matured
    
    const bankDistribution = {}; // Count FDs by bank
    
    const today = new Date();
    
    fds.forEach(fd => {
      const principal = parseFloat(fd.principleAmount);
      const rate = parseFloat(fd.interestRate);
      
      totalPrincipal += principal;
      
      let interestAmount = 0;
      if (fd.durationType === 'years') {
        interestAmount = principal * (rate / 100) * parseInt(fd.duration);
      } else {
        interestAmount = principal * (rate / 100) * (parseInt(fd.duration) / 365);
      }
      totalInterest += interestAmount;
      
      // Count by maturity timeframe
      const dueDate = new Date(fd.dueDate);
      const timeDiff = dueDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      if (daysRemaining <= 0) {
        matured++;
      } else if (daysRemaining <= 30) {
        soon++;
      } else if (daysRemaining <= 90) {
        medium++;
      } else {
        long++;
      }
      
      // Count by bank
      if (!bankDistribution[fd.bankName]) {
        bankDistribution[fd.bankName] = 0;
      }
      bankDistribution[fd.bankName]++;
    });
    
    return {
      totalPrincipal,
      totalInterest,
      totalMaturityValue: totalPrincipal + totalInterest,
      maturityDistribution: { matured, soon, medium, long },
      bankDistribution,
      totalCount: fds.length
    };
  };
  
  // Get notifications for upcoming maturities
  const getNotifications = () => {
    const today = new Date();
    
    return fds.filter(fd => {
      const dueDate = new Date(fd.dueDate);
      const timeDiff = dueDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      // Include FDs that are maturing in the next 30 days or already matured but not older than 7 days
      return (daysRemaining <= 30 && daysRemaining >= 0) || (daysRemaining < 0 && daysRemaining >= -7);
    }).sort((a, b) => {
      // Sort by due date (closest first)
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  };
  
  const notifications = getNotifications();
  const stats = calculateSummaryStats();
  const filteredAndSortedFDs = getFilteredAndSortedFDs();
  
  // Get unique banks from FDs for the filter dropdown
  const uniqueBanks = [...new Set(fds.map(fd => fd.bankName))].filter(bank => bank);
  
  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-4">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">Fixed Deposit Management System</h1>
      
      {/* Dashboard & Statistics Section */}
      {fds.length > 0 && stats && (
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md mb-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg sm:text-xl font-semibold">Dashboard Summary</h2>
            <button
              onClick={() => setShowStats(!showStats)}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
            >
              {showStats ? 'Hide Details' : 'Show Details'}
              <ChevronDown 
                size={16} 
                className={`ml-1 transform ${showStats ? 'rotate-180' : ''} transition-transform`} 
              />
            </button>
          </div>
          
          {showStats && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Total Investment</div>
                  <div className="text-xl font-bold text-blue-800">
                    ₹{stats.totalPrincipal.toLocaleString(undefined, {maximumFractionDigits: 2})}
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Expected Interest</div>
                  <div className="text-xl font-bold text-green-700">
                    ₹{stats.totalInterest.toLocaleString(undefined, {maximumFractionDigits: 2})}
                  </div>
                </div>
                
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Total Maturity Value</div>
                  <div className="text-xl font-bold text-indigo-700">
                    ₹{stats.totalMaturityValue.toLocaleString(undefined, {maximumFractionDigits: 2})}
                  </div>
                </div>
                
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Total Fixed Deposits</div>
                  <div className="text-xl font-bold text-purple-700">
                    {stats.totalCount}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Maturity Timeline</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="text-center p-2 bg-red-100 rounded">
                      <div className="font-bold">{stats.maturityDistribution.matured}</div>
                      <div className="text-xs">Matured</div>
                    </div>
                    <div className="text-center p-2 bg-yellow-100 rounded">
                      <div className="font-bold">{stats.maturityDistribution.soon}</div>
                      <div className="text-xs">≤ 30 days</div>
                    </div>
                    <div className="text-center p-2 bg-blue-100 rounded">
                      <div className="font-bold">{stats.maturityDistribution.medium}</div>
                      <div className="text-xs">31-90 days</div>
                    </div>
                    <div className="text-center p-2 bg-green-100 rounded">
                      <div className="font-bold">{stats.maturityDistribution.long}</div>
                      <div className="text-xs">> 90 days</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Top Banks</h3>
                  <div className="grid grid-cols-1 gap-1">
                    {Object.entries(stats.bankDistribution)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3)
                      .map(([bank, count]) => (
                        <div key={bank} className="flex justify-between items-center p-1 bg-white rounded">
                          <div className="truncate max-w-[70%]">{bank}</div>
                          <div className="font-medium text-gray-700">{count} FDs</div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* Notifications Section */}
      {notifications.length > 0 && (
        <div className="bg-yellow-50 p-3 sm:p-6 rounded-lg shadow-md mb-4 border border-yellow-200">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <Bell size={18} className="text-yellow-600 mr-2" />
              <h2 className="text-lg sm:text-xl font-semibold text-yellow-800">Maturity Alerts</h2>
            </div>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="text-yellow-600 hover:text-yellow-800 text-sm flex items-center"
            >
              {showNotifications ? 'Hide' : `Show ${notifications.length} Alert${notifications.length > 1 ? 's' : ''}`}
              <ChevronDown 
                size={16} 
                className={`ml-1 transform ${showNotifications ? 'rotate-180' : ''} transition-transform`} 
              />
            </button>
          </div>
          
          {showNotifications && (
            <ul className="divide-y divide-yellow-200">
              {notifications.map((fd, index) => {
                const today = new Date();
                const dueDate = new Date(fd.dueDate);
                const timeDiff = dueDate.getTime() - today.getTime();
                const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                
                let messageClass = "text-green-600";
                let message = `Maturing in ${daysRemaining} days`;
                
                if (daysRemaining < 0) {
                  messageClass = "text-red-600 font-medium";
                  message = `Matured ${Math.abs(daysRemaining)} days ago`;
                } else if (daysRemaining <= 7) {
                  messageClass = "text-red-600";
                } else if (daysRemaining <= 14) {
                  messageClass = "text-orange-600";
                } else if (daysRemaining <= 30) {
                  messageClass = "text-yellow-600";
                }
                
                return (
                  <li key={fd.id} className="py-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{fd.bankName} - {fd.accountNumber}</div>
                        <div className="text-sm text-gray-600">
                          ₹{parseFloat(fd.principleAmount).toLocaleString()} • Due: {new Date(fd.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={`${messageClass} text-sm sm:text-base`}>{message}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md mb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <h2 className="text-lg sm:text-xl font-semibold">Data Management</h2>
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <button 
              onClick={exportData}
              className="bg-green-600 text-white py-1 sm:py-2 px-2 sm:px-4 rounded hover:bg-green-700 flex items-center gap-1 sm:gap-2 text-sm sm:text-base flex-1 sm:flex-none justify-center"
            >
              <Download size={16} /> Export
            </button>
            
            <label className="bg-purple-600 text-white py-1 sm:py-2 px-2 sm:px-4 rounded hover:bg-purple-700 flex items-center gap-1 sm:gap-2 cursor-pointer text-sm sm:text-base flex-1 sm:flex-none justify-center">
              <Upload size={16} /> Import
              <input 
                type="file" 
                accept=".json" 
                onChange={importData} 
                className="hidden" 
              />
            </label>
          </div>
        </div>
        
        <p className="text-xs sm:text-sm text-gray-600">
          Export your FD data to save as a backup or to transfer to another device. 
          Import previously exported data to restore your FDs.
        </p>
      </div>
      
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md mb-6 fd-form-container">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
          {editIndex !== null ? 'Edit Fixed Deposit' : 'Add New Fixed Deposit'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Account Number</label>
              <input
                type="text"
                name="accountNumber"
                value={formData.accountNumber}
                onChange={handleInputChange}
                className="w-full p-2 border rounded text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Bank Name</label>
              <div className="relative">
                <select
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm appearance-none pr-8"
                  required
                >
                  <option value="">Select a bank</option>
                  {commonBanks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              
              {showCustomBank && (
                <div className="mt-2">
                  <input
                    type="text"
                    name="customBankName"
                    value={formData.customBankName}
                    onChange={handleInputChange}
                    placeholder="Enter bank name"
                    className="w-full p-2 border rounded text-sm"
                    required
                  />
                </div>
              )}
            </div>
            
            <div>
            <label className="block text-xs sm:text-sm font-medium mb-1">Holder Name</label>
              <input
                type="text"
                name="holderName"
                value={formData.holderName}
                onChange={handleInputChange}
                className="w-full p-2 border rounded text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Principal Amount</label>
              <input
                type="number"
                name="principleAmount"
                value={formData.principleAmount}
                onChange={handleInputChange}
                className="w-full p-2 border rounded text-sm"
                required
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Interest Rate (%)</label>
              <input
                type="number"
                name="interestRate"
                value={formData.interestRate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded text-sm"
                required
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Due Date / Renewal Date</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
                className="w-full p-2 border rounded text-sm"
                required
              />
            </div>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium mb-1">Term / Duration</label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded text-sm"
                  required
                  min="1"
                />
              </div>
              <div className="w-20 sm:w-24">
                <label className="block text-xs sm:text-sm font-medium mb-1">Unit</label>
                <div className="relative">
                  <select
                    name="durationType"
                    value={formData.durationType}
                    onChange={handleInputChange}
                    className="w-full p-2 border rounded h-10 text-sm appearance-none pr-6"
                  >
                    <option value="years">Years</option>
                    <option value="days">Days</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs sm:text-sm font-medium mb-1">Start Date (Calculated)</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                className="w-full p-2 border rounded text-sm bg-gray-100"
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
      
      {/* Filtering and Sorting Controls */}
      {fds.length > 0 && (
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md mb-4">
          <h3 className="text-md font-medium mb-3">Filter & Sort</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Filter by Bank</label>
              <div className="relative">
                <select
                  name="bank"
                  value={filterBy.bank}
                  onChange={handleFilter}
                  className="w-full p-2 border rounded text-sm appearance-none"
                >
                  <option value="">All Banks</option>
                  {uniqueBanks.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1">Filter by Maturity</label>
              <div className="relative">
                <select
                  name="maturityTimeframe"
                  value={filterBy.maturityTimeframe}
                  onChange={handleFilter}
                  className="w-full p-2 border rounded text-sm appearance-none"
                >
                  <option value="all">All FDs</option>
                  <option value="soon">Maturing Soon (≤30 days)</option>
                  <option value="medium">Medium Term (31-90 days)</option>
                  <option value="long">Long Term (>90 days)</option>
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1">Sort By</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={sortConfig.key}
                    onChange={(e) => handleSort(e.target.value)}
                    className="w-full p-2 border rounded text-sm appearance-none"
                  >
                    <option value="dueDate">Due Date</option>
                    <option value="bankName">Bank Name</option>
                    <option value="principleAmount">Principal Amount</option>
                    <option value="interestRate">Interest Rate</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                
                <button
                  onClick={() => setSortConfig(prev => ({
                    ...prev,
                    direction: prev.direction === 'asc' ? 'desc' : 'asc'
                  }))}
                  className="p-2 border rounded bg-gray-50 hover:bg-gray-100"
                  title={sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortConfig.direction === 'asc' ? (
                    <SortAsc size={18} className="text-gray-700" />
                  ) : (
                    <SortDesc size={18} className="text-gray-700" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Interest Breakdown View */}
      {viewInterestBreakdown && (
        <div 
          id={`breakdown-${viewInterestBreakdown.index}`}
          className="bg-white p-3 sm:p-6 rounded-lg shadow-md mb-6 border-2 border-blue-300"
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg sm:text-xl font-semibold text-blue-700">
              Interest Breakdown for {fds[viewInterestBreakdown.index].bankName}
            </h2>
            <button 
              onClick={() => setViewInterestBreakdown(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="text-sm mb-4">
            <p>Account: {fds[viewInterestBreakdown.index].accountNumber}</p>
            <p>Principal: {parseFloat(fds[viewInterestBreakdown.index].principleAmount).toLocaleString()}</p>
            <p>Rate: {fds[viewInterestBreakdown.index].interestRate}% per annum</p>
            <p>Term: {fds[viewInterestBreakdown.index].duration} {fds[viewInterestBreakdown.index].durationType}</p>
          </div>
          
          <div className="mb-1">
            <h3 className="text-md font-semibold mb-2">Select View:</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(viewInterestBreakdown.breakdowns).map(interval => (
                <button
                  key={interval}
                  onClick={() => {
                    // Switch to this interval tab
                    setViewInterestBreakdown({
                      ...viewInterestBreakdown,
                      activeInterval: interval
                    });
                  }}
                  className={`px-4 py-1 text-sm rounded-full ${
                    viewInterestBreakdown.activeInterval === interval 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {interval.charAt(0).toUpperCase() + interval.slice(1)} View
                </button>
              ))}
            </div>
          </div>
          
          {viewInterestBreakdown.activeInterval && viewInterestBreakdown.breakdowns[viewInterestBreakdown.activeInterval] && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border p-2 text-left">Date</th>
                    <th className="border p-2 text-right">Interest for Period</th>
                    <th className="border p-2 text-right">Cumulative Interest</th>
                    <th className="border p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInterestBreakdown.breakdowns[viewInterestBreakdown.activeInterval].map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border p-2">{item.formattedDate}</td>
                      <td className="border p-2 text-right">{parseFloat(item.periodInterest).toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                      <td className="border p-2 text-right">{parseFloat(item.cumulativeInterest).toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                      <td className="border p-2 text-right font-medium">{parseFloat(item.projectedTotal).toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <div className="text-xs text-gray-500 mt-3">
            Note: This is a projected breakdown based on the annual interest rate. The actual amounts may vary based on the bank's calculation method.
          </div>
        </div>
      )}
      
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Fixed Deposits</h2>
        
        {fds.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No fixed deposits found. Add your first FD above.</p>
        ) : filteredAndSortedFDs.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No fixed deposits match your filters.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredAndSortedFDs.map((fd, index) => {
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
              
              // Find the actual index in the original array for actions
              const originalIndex = fds.findIndex(originalFd => originalFd.id === fd.id);
              
              return (
                <div key={fd.id} className="bg-gray-50 rounded-lg shadow overflow-hidden border border-gray-200">
                  <div className="bg-blue-600 text-white p-2 sm:p-3 flex justify-between items-center">
                    <div className="font-medium text-sm sm:text-base truncate max-w-[70%]" title={fd.bankName}>
                      {fd.bankName}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => toggleInterestBreakdown(originalIndex)}
                        className="text-white hover:text-blue-200"
                        title="View Interest Breakdown"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(originalIndex)}
                        className="text-white hover:text-blue-200"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(originalIndex)}
                        className="text-white hover:text-blue-200"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-3 sm:p-4">
                    <div className="mb-3 sm:mb-4">
                      <div className="text-xs sm:text-sm text-gray-500">Account Number</div>
                      <div className="font-medium text-sm sm:text-base">{fd.accountNumber}</div>
                    </div>
                    
                    <div className="mb-3 sm:mb-4">
                      <div className="text-xs sm:text-sm text-gray-500">Holder Name</div>
                      <div className="font-medium text-sm sm:text-base">{fd.holderName}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div>
                        <div className="text-xs sm:text-sm text-gray-500">Principal</div>
                        <div className="font-medium text-sm sm:text-base">{parseFloat(fd.principleAmount).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-gray-500">Interest Rate</div>
                        <div className="font-medium text-sm sm:text-base">{fd.interestRate}%</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div>
                        <div className="text-xs sm:text-sm text-gray-500">Start Date</div>
                        <div className="font-medium text-sm sm:text-base">{new Date(fd.startDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm text-gray-500">Due Date</div>
                        <div className="font-medium text-sm sm:text-base">{new Date(fd.dueDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                      <div>
                        <div className="text-xs sm:text-sm text-gray-500">Term</div>
                        <div className="font-medium text-sm sm:text-base">{fd.duration} {fd.durationType}</div>
                      </div>
                    </div>
                    
                    <div className="pt-2 sm:pt-3 border-t">
                      <div className="flex justify-between items-center mb-1 sm:mb-2">
                        <div className="text-xs sm:text-sm text-gray-500">Interest Earned</div>
                        <div className="font-medium text-green-600 text-sm sm:text-base">
                          {interestAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </div>
                      </div>
                      <div className="flex justify-between items-center mb-1 sm:mb-2">
                        <div className="text-xs sm:text-sm text-gray-500">Maturity Amount</div>
                        <div className="font-medium text-green-700 text-sm sm:text-base">
                          {maturityAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => toggleInterestBreakdown(originalIndex)}
                        className="w-full mt-2 text-center py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs sm:text-sm rounded flex items-center justify-center gap-1"
                      >
                        <Eye size={14} /> View Interest Breakdown
                      </button>
                    </div>
                  </div>
                  
                  <div className={`p-1 sm:p-2 text-center text-xs sm:text-sm font-medium ${
                    daysRemaining <= 30 ? 'bg-red-100 text-red-700' : 
                    daysRemaining <= 90 ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-green-100 text-green-700'
                  }`}>
                    {daysRemaining <= 0 ? 'Matured' : `${daysRemaining} days remaining`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Simple graphical representation of portfolio - Optional chart */}
      {fds.length > 0 && stats && (
        <div className="bg-white p-3 sm:p-6 rounded-lg shadow-md mt-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3">Portfolio Visualization</h2>
          
          <div className="text-sm mb-4">
            <p>This simple visualization shows the distribution of your fixed deposits.</p>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Distribution by Bank</h3>
            <div className="h-8 w-full bg-gray-100 rounded overflow-hidden flex">
              {Object.entries(stats.bankDistribution).map(([bank, count], index) => {
                // Calculate percentage
                const percentage = (count / stats.totalCount) * 100;
                
                // Generate a color based on index
                const colors = [
                  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
                  'bg-yellow-500', 'bg-red-500', 'bg-indigo-500',
                  'bg-pink-500', 'bg-teal-500', 'bg-orange-500'
                ];
                
                const color = colors[index % colors.length];
                
                return (
                  <div 
                    key={bank} 
                    className={`${color} h-full`} 
                    style={{ width: `${percentage}%` }}
                    title={`${bank}: ${count} FDs (${percentage.toFixed(1)}%)`}
                  ></div>
                );
              })}
            </div>
            <div className="flex flex-wrap mt-2 text-xs">
              {Object.entries(stats.bankDistribution).map(([bank, count], index) => {
                const colors = [
                  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
                  'bg-yellow-500', 'bg-red-500', 'bg-indigo-500',
                  'bg-pink-500', 'bg-teal-500', 'bg-orange-500'
                ];
                
                const color = colors[index % colors.length];
                
                return (
                  <div key={bank} className="flex items-center mr-4 mb-1">
                    <div className={`w-3 h-3 ${color} mr-1 rounded-sm`}></div>
                    <span className="truncate max-w-[150px]" title={bank}>{bank}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-2">Maturity Timeline</h3>
            <div className="h-8 w-full bg-gray-100 rounded overflow-hidden flex">
              {/* Matured */}
              {stats.maturityDistribution.matured > 0 && (
                <div 
                  className="bg-red-500 h-full" 
                  style={{ width: `${(stats.maturityDistribution.matured / stats.totalCount) * 100}%` }}
                  title={`Matured: ${stats.maturityDistribution.matured} FDs`}
                ></div>
              )}
              
              {/* Soon (<=30 days) */}
              {stats.maturityDistribution.soon > 0 && (
                <div 
                  className="bg-yellow-500 h-full" 
                  style={{ width: `${(stats.maturityDistribution.soon / stats.totalCount) * 100}%` }}
                  title={`Soon (≤30 days): ${stats.maturityDistribution.soon} FDs`}
                ></div>
              )}
              
              {/* Medium (31-90 days) */}
              {stats.maturityDistribution.medium > 0 && (
                <div 
                  className="bg-blue-500 h-full" 
                  style={{ width: `${(stats.maturityDistribution.medium / stats.totalCount) * 100}%` }}
                  title={`Medium (31-90 days): ${stats.maturityDistribution.medium} FDs`}
                ></div>
              )}
              
              {/* Long (>90 days) */}
              {stats.maturityDistribution.long > 0 && (
                <div 
                  className="bg-green-500 h-full" 
                  style={{ width: `${(stats.maturityDistribution.long / stats.totalCount) * 100}%` }}
                  title={`Long (>90 days): ${stats.maturityDistribution.long} FDs`}
                ></div>
              )}
            </div>
            <div className="flex flex-wrap mt-2 text-xs">
              <div className="flex items-center mr-4 mb-1">
                <div className="w-3 h-3 bg-red-500 mr-1 rounded-sm"></div>
                <span>Matured</span>
              </div>
              <div className="flex items-center mr-4 mb-1">
                <div className="w-3 h-3 bg-yellow-500 mr-1 rounded-sm"></div>
                <span>Soon (≤30 days)</span>
              </div>
              <div className="flex items-center mr-4 mb-1">
                <div className="w-3 h-3 bg-blue-500 mr-1 rounded-sm"></div>
                <span>Medium (31-90 days)</span>
              </div>
              <div className="flex items-center mr-4 mb-1">
                <div className="w-3 h-3 bg-green-500 mr-1 rounded-sm"></div>
                <span>Long (>90 days)</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-xs text-center text-gray-500 mt-6">
        &copy; {new Date().getFullYear()} Fixed Deposit Management System
      </div>
    </div>
  );
}
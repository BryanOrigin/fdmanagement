import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Plus, RefreshCw, Cloud } from 'lucide-react';

export default function FDManagementWithGoogleSheets() {
  const [fds, setFds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
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

  // Initialize Google API client
  useEffect(() => {
    const initGoogleAPI = () => {
      if (window.gapi) {
        window.gapi.load('client:auth2', initClient);
      } else {
        // Load Google API script if not already loaded
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          window.gapi.load('client:auth2', initClient);
        };
        document.body.appendChild(script);
      }
    };

    const initClient = () => {
      window.gapi.client.init({
        apiKey: 'AIzaSyDHW_gKZlLB6bicp1ltdXRmUdRt7gJJvdo', // Your API key
        clientId: '476126862033-hk0u5pnonu910os60lusuog7j9el79p7.apps.googleusercontent.com', // Your client ID
        discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        // Explicitly set the redirect URI to match what's in your console
        redirect_uri: window.location.origin // This should match exactly what's in console
      }).then(() => {
        // Listen for sign-in state changes
        window.gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
        
        // Handle the initial sign-in state
        updateSigninStatus(window.gapi.auth2.getAuthInstance().isSignedIn.get());
      }).catch(error => {
        console.error('Error initializing Google API client:', error);
        setError(`Error initializing Google API client: ${error.message}`);
        setIsLoading(false);
      });
    };

    const updateSigninStatus = (isSignedIn) => {
      setIsAuthenticated(isSignedIn);
      if (isSignedIn && spreadsheetId) {
        loadDataFromGoogleSheets();
      } else {
        setIsLoading(false);
      }
    };

    initGoogleAPI();
  }, [spreadsheetId]);

  // Load data from Google Sheets
  const loadDataFromGoogleSheets = async () => {
    if (!isAuthenticated || !spreadsheetId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setConnectionStatus('connecting');
    
    try {
      // First check if the sheet exists and has the proper structure
      const response = await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
      });
      
      // Check if 'FixedDeposits' sheet exists, if not create it
      const sheets = response.result.sheets;
      let fdSheetExists = false;
      
      for (const sheet of sheets) {
        if (sheet.properties.title === 'FixedDeposits') {
          fdSheetExists = true;
          break;
        }
      }
      
      if (!fdSheetExists) {
        // Create the sheet with headers
        await window.gapi.client.sheets.spreadsheets.batchUpdate({
          spreadsheetId: spreadsheetId,
          resource: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'FixedDeposits'
                  }
                }
              }
            ]
          }
        });
        
        // Add headers
        await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: 'FixedDeposits!A1:J1',
          valueInputOption: 'RAW',
          resource: {
            values: [['id', 'accountNumber', 'holderName', 'bankName', 'principleAmount', 
              'interestRate', 'dueDate', 'duration', 'durationType', 'startDate']]
          }
        });
      }
      
      // Now get the data
      const dataResponse = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'FixedDeposits!A2:J'
      });

      const rows = dataResponse.result.values || [];
      
      // Convert rows to FD objects
      const loadedFds = rows.map(row => ({
        id: row[0],
        accountNumber: row[1],
        holderName: row[2],
        bankName: row[3],
        principleAmount: row[4],
        interestRate: row[5],
        dueDate: row[6],
        duration: row[7],
        durationType: row[8],
        startDate: row[9]
      }));
      
      setFds(loadedFds);
      setConnectionStatus('connected');
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data from Google Sheets:', error);
      setError(`Failed to load data: ${error.message}`);
      setConnectionStatus('error');
      setIsLoading(false);
    }
  };

  // Save data to Google Sheets
  const saveDataToGoogleSheets = async (updatedFds) => {
    if (!isAuthenticated || !spreadsheetId) {
      setError("Not authenticated with Google Sheets.");
      return;
    }

    setIsSaving(true);
    
    try {
      // Clear existing data except headers
      await window.gapi.client.sheets.spreadsheets.values.clear({
        spreadsheetId: spreadsheetId,
        range: 'FixedDeposits!A2:J'
      });
      
      // Format data for sheets
      const rows = updatedFds.map(fd => [
        fd.id.toString(),
        fd.accountNumber,
        fd.holderName,
        fd.bankName,
        fd.principleAmount,
        fd.interestRate,
        fd.dueDate,
        fd.duration,
        fd.durationType,
        fd.startDate
      ]);
      
      // Write all data at once
      if (rows.length > 0) {
        await window.gapi.client.sheets.spreadsheets.values.update({
          spreadsheetId: spreadsheetId,
          range: `FixedDeposits!A2:J${rows.length + 1}`,
          valueInputOption: 'RAW',
          resource: {
            values: rows
          }
        });
      }
      
      setIsSaving(false);
    } catch (error) {
      console.error('Error saving data to Google Sheets:', error);
      setError(`Failed to save data: ${error.message}`);
      setIsSaving(false);
    }
  };

  // Handle Google sign in
  const handleGoogleSignIn = () => {
    if (window.gapi && window.gapi.auth2) {
      window.gapi.auth2.getAuthInstance().signIn();
    } else {
      setError('Google API not loaded. Please reload the page.');
    }
  };

  // Handle Google sign out
  const handleGoogleSignOut = () => {
    if (window.gapi && window.gapi.auth2) {
      window.gapi.auth2.getAuthInstance().signOut();
      setFds([]);
      setConnectionStatus('disconnected');
    }
  };

  // Handle connecting to spreadsheet
  const handleConnectSpreadsheet = (e) => {
    e.preventDefault();
    if (spreadsheetId && isAuthenticated) {
      loadDataFromGoogleSheets();
    }
  };

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
    await saveDataToGoogleSheets(updatedFds); // Save to Google Sheets
    
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
    await saveDataToGoogleSheets(updatedFds); // Save to Google Sheets
  };
  
  const handleRefresh = () => {
    loadDataFromGoogleSheets();
  };
  
  // Render authentication section if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Fixed Deposit Management System</h1>
        <div className="text-center mb-8">
          <Cloud size={64} className="mx-auto text-blue-500 mb-4" />
          <p className="mb-4">Connect to Google Sheets to manage your fixed deposits</p>
          <button 
            onClick={handleGoogleSignIn}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 mx-auto"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.25 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }
  
  // Render spreadsheet connection form if authenticated but not connected
  if (isAuthenticated && connectionStatus !== 'connected') {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Fixed Deposit Management System</h1>
        <div className="mb-6">
          <p className="mb-4 text-center">
            You're signed in. Now connect to your Google Sheet.
          </p>
          <form onSubmit={handleConnectSpreadsheet} className="mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Google Spreadsheet ID</label>
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Paste your spreadsheet ID here"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in your spreadsheet URL: https://docs.google.com/spreadsheets/d/<span className="font-bold">spreadsheetId</span>/edit
              </p>
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex items-center justify-center gap-2"
              disabled={connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Cloud size={18} /> Connect to Spreadsheet
                </>
              )}
            </button>
          </form>
          
          <div className="text-center">
            <button 
              onClick={handleGoogleSignOut}
              className="text-blue-600 hover:underline"
            >
              Sign out
            </button>
          </div>
        </div>
        
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h2 className="text-red-700 font-semibold mb-2">Error</h2>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your fixed deposits from Google Sheets...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Fixed Deposit Management System</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Connected to Google Sheets</span>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
      </div>
      
      <div className="mb-4 flex justify-between">
        <button 
          onClick={handleGoogleSignOut}
          className="px-4 py-2 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2"
        >
          Sign Out
        </button>
        
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center gap-2"
        >
          <RefreshCw size={16} /> Refresh Data
        </button>
      </div>
      
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
                <span>Saving to Google Sheets...</span>
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
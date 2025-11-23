import { useState, useEffect } from "react";
import { LogIn, LogOut, CheckCircle, XCircle, Calendar, Mail, User as UserIcon, Shield, Trash2, Download, Upload, Database } from "lucide-react";
import Button from "../components/Button";
import { getStorageInfo, clearAllData, exportData, importData } from "../services/storage";

export default function AccountsPage({ 
  googleSignedIn, 
  googleInitialized,
  outlookSignedIn, 
  outlookInitialized,
  onGoogleSignIn,
  onGoogleSignOut,
  onOutlookSignIn,
  onOutlookSignOut,
  onClearData,
  tasks,
  groups
}) {
  const [googleProfile, setGoogleProfile] = useState(null);
  const [outlookProfile, setOutlookProfile] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [isClearing, setIsClearing] = useState(false);

  // Load storage info
  useEffect(() => {
    setStorageInfo(getStorageInfo());
  }, [tasks, groups]);

  // Load user profiles when signed in
  useEffect(() => {
    const loadProfiles = async () => {
      // Load Google profile if available
      if (googleSignedIn) {
        try {
          // Note: You might want to add a getGoogleProfile function to googleCalendar.js
          // For now, we'll use basic info
          setGoogleProfile({ name: "Google User", email: "user@gmail.com" });
        } catch (error) {
          console.error("Failed to load Google profile:", error);
        }
      } else {
        setGoogleProfile(null);
      }

      // Load Outlook profile if available
      if (outlookSignedIn) {
        try {
          // You can uncomment this when the getOutlookProfile function is available
          // const profile = await getOutlookProfile();
          // setOutlookProfile(profile);
          setOutlookProfile({ name: "Microsoft User", email: "user@outlook.com" });
        } catch (error) {
          console.error("Failed to load Outlook profile:", error);
        }
      } else {
        setOutlookProfile(null);
      }
    };

    loadProfiles();
  }, [googleSignedIn, outlookSignedIn]);

  const handleClearData = async () => {
    if (!confirm(
      'Are you sure you want to clear all data?\n\n' +
      'This will permanently delete:\n' +
      `• ${storageInfo?.tasksCount || 0} tasks\n` +
      `• ${storageInfo?.groupsCount || 0} groups\n` +
      '• All settings and preferences\n\n' +
      'This action cannot be undone.'
    )) {
      return;
    }

    setIsClearing(true);
    try {
      const success = clearAllData();
      if (success) {
        onClearData(); // Update app state
        setStorageInfo(getStorageInfo()); // Refresh storage info
        alert('All data has been cleared successfully.');
      } else {
        alert('Failed to clear data. Please try again.');
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('An error occurred while clearing data.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportData = () => {
    try {
      const success = exportData();
      if (success) {
        alert('Data exported successfully! Check your downloads folder.');
      } else {
        alert('Failed to export data. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('An error occurred during export.');
    }
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm(
      'Importing data will replace all current data.\n\n' +
      'Make sure to export your current data first if you want to keep it.\n\n' +
      'Continue with import?'
    )) {
      event.target.value = ''; // Reset file input
      return;
    }

    importData(file)
      .then((result) => {
        alert(
          `Data imported successfully!\n\n` +
          `• ${result.tasksCount} tasks imported\n` +
          `• ${result.groupsCount} groups imported\n` +
          `• Export date: ${result.importDate}\n\n` +
          'Please refresh the page to see imported data.'
        );
        // Refresh the page to load new data
        window.location.reload();
      })
      .catch((error) => {
        console.error('Import error:', error);
        alert(`Failed to import data: ${error.message}`);
      })
      .finally(() => {
        event.target.value = ''; // Reset file input
      });
  };

  const AccountCard = ({ 
    title, 
    icon, 
    initialized, 
    signedIn, 
    profile, 
    onSignIn, 
    onSignOut, 
    description,
    features 
  }) => (
    <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ 
          background: signedIn ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)', 
          borderRadius: '50%', 
          width: '3rem', 
          height: '3rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: signedIn ? 'white' : '#6b7280'
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, color: 'var(--color-text)', fontWeight: 600 }}>{title}</h3>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
            {description}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {signedIn ? (
            <CheckCircle size={20} style={{ color: '#22c55e' }} />
          ) : (
            <XCircle size={20} style={{ color: '#ef4444' }} />
          )}
          <span style={{ 
            fontSize: '0.875rem', 
            fontWeight: 500,
            color: signedIn ? '#22c55e' : '#ef4444' 
          }}>
            {signedIn ? 'Connected' : 'Not Connected'}
          </span>
        </div>
      </div>

      {/* User Profile Section */}
      {signedIn && profile && (
        <div style={{ 
          background: 'var(--color-bg)', 
          borderRadius: 'var(--radius)', 
          padding: '1rem', 
          marginBottom: '1.5rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <UserIcon size={16} style={{ color: 'var(--color-text-light)' }} />
            <div>
              <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{profile.name}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-light)' }}>{profile.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Features List */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--color-text)', fontSize: '0.875rem', fontWeight: 600 }}>
          Available Features:
        </h4>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
          {features.map((feature, index) => (
            <li key={index} style={{ marginBottom: '0.25rem' }}>{feature}</li>
          ))}
        </ul>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {!initialized ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            color: 'var(--color-text-light)',
            fontSize: '0.875rem'
          }}>
            <Shield size={16} />
            Configuration required
          </div>
        ) : signedIn ? (
          <Button 
            variant="outline" 
            onClick={onSignOut}
            style={{ 
              borderColor: '#ef4444', 
              color: '#ef4444',
              '--hover-bg': '#fef2f2'
            }}
          >
            <LogOut size={16} /> Sign Out
          </Button>
        ) : (
          <Button 
            onClick={onSignIn}
            style={{ 
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              border: 'none'
            }}
          >
            <LogIn size={16} /> Connect Account
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="container" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)', minHeight: '100vh' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '2rem', marginBottom: '0.75rem' }}>
          Account Management
        </h1>
        <p style={{ color: 'var(--color-text-light)', fontSize: '1.125rem' }}>
          Connect your calendar accounts to sync tasks and events seamlessly
        </p>
      </div>

      <div style={{ display: 'grid', gap: '2rem', maxWidth: '800px' }}>
        {/* Google Calendar Account */}
        <AccountCard
          title="Google Calendar"
          icon={<Calendar size={24} />}
          initialized={googleInitialized}
          signedIn={googleSignedIn}
          profile={googleProfile}
          onSignIn={onGoogleSignIn}
          onSignOut={onGoogleSignOut}
          description="Sync with Google Calendar to import/export events and tasks"
          features={[
            "Export tasks as calendar events",
            "Import existing calendar events as tasks", 
            "Support for recurring daily tasks",
            "Color-coded events (completed vs pending)",
            "Automatic timezone handling"
          ]}
        />

        {/* Microsoft Outlook Account */}
        <AccountCard
          title="Microsoft Outlook"
          icon={<Mail size={24} />}
          initialized={outlookInitialized}
          signedIn={outlookSignedIn}
          profile={outlookProfile}
          onSignIn={onOutlookSignIn}
          onSignOut={onOutlookSignOut}
          description="Connect to Outlook Calendar for Office 365 integration"
          features={[
            "Export tasks to Outlook Calendar",
            "Import Outlook calendar events as tasks",
            "Recurring event support with RRULE",
            "Category-based organization",
            "Cross-platform synchronization"
          ]}
        />
      </div>

      {/* Data Management Section */}
      <div className="card" style={{ padding: '2rem', marginTop: '2rem', maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Database size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ margin: 0, color: 'var(--color-text)', fontWeight: 600 }}>Data Management</h3>
        </div>
        
        {/* Storage Info */}
        {storageInfo && (
          <div style={{ 
            background: 'var(--color-bg)', 
            borderRadius: 'var(--radius)', 
            padding: '1rem', 
            marginBottom: '1.5rem',
            border: '1px solid var(--color-border)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {storageInfo.tasksCount}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-light)' }}>Tasks Stored</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {storageInfo.groupsCount}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-light)' }}>Groups Created</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {storageInfo.formattedSize}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-light)' }}>Storage Used</div>
              </div>
            </div>
          </div>
        )}

        {/* Data Actions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <Button 
            onClick={handleExportData}
            style={{ 
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: 'none'
            }}
          >
            <Download size={16} /> Export Backup
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => document.getElementById('import-file').click()}
            style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
          >
            <Upload size={16} /> Import Backup
          </Button>
          
          <Button 
            variant="outline"
            onClick={handleClearData}
            disabled={isClearing}
            style={{ 
              borderColor: '#ef4444', 
              color: '#ef4444',
              opacity: isClearing ? 0.6 : 1
            }}
          >
            <Trash2 size={16} /> {isClearing ? 'Clearing...' : 'Clear All Data'}
          </Button>
        </div>

        {/* Hidden file input */}
        <input
          id="import-file"
          type="file"
          accept=".json"
          onChange={handleImportData}
          style={{ display: 'none' }}
        />

        <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            <strong>Export Backup:</strong> Download all your tasks and settings as a JSON file for safekeeping.
          </p>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            <strong>Import Backup:</strong> Restore data from a previously exported backup file.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Clear Data:</strong> Permanently delete all tasks, groups, and settings from this browser.
          </p>
        </div>
      </div>

      {/* Privacy & Security Section */}
      <div className="card" style={{ padding: '2rem', marginTop: '2rem', maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <Shield size={20} style={{ color: 'var(--color-primary)' }} />
          <h3 style={{ margin: 0, color: 'var(--color-text)', fontWeight: 600 }}>Privacy & Security</h3>
        </div>
        <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          <p style={{ margin: '0 0 1rem 0' }}>
            Your calendar data is processed locally in your browser. We only request the minimum permissions 
            necessary for calendar synchronization.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Google:</strong> Requires calendar.events scope for reading and writing calendar events
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Microsoft:</strong> Requires Calendars.ReadWrite and User.Read permissions
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              Authentication tokens are stored securely in your browser session
            </li>
            <li>
              No personal data is sent to external servers beyond the official APIs
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
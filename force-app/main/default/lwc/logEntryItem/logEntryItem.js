/**
 * @author Ryan Schierholz
 */
import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class LogEntryItem extends NavigationMixin(LightningElement) {
    @api logEntry;            // Object containing all the log info (level, timestamp, shortMessage, location, etc.)
    @api isNew = false;       // Pass this as true when you initially insert a log entry, so we can highlight it
    @api useIcons = false;     // Pass this as true if you want to use an icon for the log level
    @track isExpanded = false;

    connectedCallback() {
        console.log('useIcons: ' + this.useIcons);
        // if new, we add highlight, then fade out after a short delay.
        if (this.isNew || this.logEntry.isNew) {
            // Trigger highlight flash for newly inserted logs
            setTimeout(() => {
              this.isNew = false;
            }, 2000);
          }
    }

    // Example: deriving an icon name based on level
    get logLevelIconVariant() {
        switch ((this.logEntry.LogLevel__c || '').toLowerCase()) {
            case 'warn':  return 'warning';
            case 'error': return 'error';
            default:      return ''; // fallback
        }
    }

    // Example: deriving an icon name based on level
    get logLevelIcon() {
        switch ((this.logEntry.LogLevel__c || '').toLowerCase()) {
            case 'debug': return 'utility:bug';
            case 'info':  return 'utility:info';
            case 'warn':  return 'utility:warning';
            case 'error': return 'utility:error';
            default:      return 'utility:info'; // fallback
        }
    }

    // Assign a CSS class for background color behind the icon
    get levelContainerClass() {
        let classes = 'level-icon-container';
        const level = (this.logEntry.LogLevel__c || '').toLowerCase();
        switch (level) {
            case 'debug':
                classes += ' debug-background';
                break;
            case 'info':
                classes += ' info-background';
                break;
            case 'warn':
                classes += ' warn-background';
                break;
            case 'error':
                classes += ' error-background';
                break;
            default:
                classes += ' info-background'; // fallback
        }
        return classes;
    }

    get logLevelBadgeClass() {
        let classes = 'slds-badge badge';
        const level = (this.logEntry.LogLevel__c || '').toLowerCase();
        switch (level) {
            case 'debug':
                classes += ' slds-badge_inverse';
                break;
            case 'warn':
                classes += ' slds-theme_warning';
                break;
            case 'error':
                classes += ' slds-theme_error';
                break;
            default:
                classes += ''; // fallback and info
        }
        return classes;
    }

    // Container CSS classes for highlight fade
    get entryContainerClass() {
        let classes = ' log-entry-container';
        //classes += this.levelContainerClass; // Add the level-specific background color; trying BADGE instead

        if (this.isNew) {
            classes += ' highlight-flash';
        }
        return classes;
    }

    // Convert timestamp to local time zone using toLocaleString()
    get localTimestamp() {
        if (!this.logEntry.CreatedDate) {
            return '';
        }
        const dateObj = new Date(this.logEntry.CreatedDate);

        // Adjust these options as needed
        const options = {
            year: '2-digit',   // Two-digit year
            month: 'short',    // Abbreviated month (e.g., Jan)
            day: '2-digit',    // Always 2-digit day
            hour: 'numeric',   // Locale-based hour (12 or 24)
            minute: 'numeric',
            second: 'numeric',
            hour12: true       // If you want AM/PM style
        };

        return dateObj.toLocaleString(undefined, options); 
    }

    get detailsButtonLabel() {
        return this.isExpanded ? 'Hide Details' : 'View Details';
    }
    get showDetailsIcon(){
        return this.isExpanded ? 'utility:chevrondown' : 'utility:chevronleft';
    }

    handleToggleDetails() {
        this.isExpanded = !this.isExpanded;
    }

    handleDelete() {
        // Dispatch an event to parent to remove this entry
        const evt = new CustomEvent('delete', {
            detail: { id: this.logEntry.Id }
        });
        this.dispatchEvent(evt);
    }

    openRecord() {
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.logEntry.Id,
                objectApiName: 'LogEntry__c',
                actionName: 'view'
            }
        });

    }
}
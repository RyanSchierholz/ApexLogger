/**
 * author mikelockett
 * date 2020-15-03
 * contributor: Ryan Schierholz
 * updated: 2024-12-20
 */
import { LightningElement, api, track } from "lwc";
import { subscribe, unsubscribe } from "lightning/empApi";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getLogs from "@salesforce/apex/LogUiController.getLogs";
import deleteLog from "@salesforce/apex/LogUiController.deleteLog";

// fields
import SHORT_MESSAGE_FIELD from "@salesforce/schema/AppLog__c.ShortMessage__c";
import CLASS_FIELD from "@salesforce/schema/AppLog__c.Class__c";
import LOG_LEVEL_FIELD from "@salesforce/schema/AppLog__c.LogLevel__c";
import AFFECTED_ID_FIELD from "@salesforce/schema/AppLog__c.AffectedId__c";

const CHANNEL_NAME = "/event/AppLogEvent__e";

const defaultColumns = [
  {
    label: "Log Name", type: "url", fieldName: "recordLink", initialWidth: 110,
    cellAttributes: { class: "idCell" },
    typeAttributes: { label: { fieldName: "Name" }, target: "_blank" }
  },
  {
    label: "Date", fieldName: "CreatedDate", type: "date", typeAttributes: {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    },
    initialWidth: 200,
    sortable: true
  },
  { label: "Short Message", fieldName: SHORT_MESSAGE_FIELD.fieldApiName },
  { label: "Location", fieldName: CLASS_FIELD.fieldApiName, initialWidth: 140 },
  { label: "Record Id", fieldName: AFFECTED_ID_FIELD.fieldApiName, initialWidth: 170 },
  { label: "Level", fieldName: LOG_LEVEL_FIELD.fieldApiName, initialWidth: 100 }
];

export default class LogReader extends LightningElement {
  // Props from meta.xml
  @api defaultLogLevels;      // e.g., "info,debug,warn"
  @api defaultLogsPerPage;    // e.g., 10
  @api useIcons;              // e.g., true
  @track logs;

  @track lppSettings = [
    { label: '10', value: 10, checked: false, icon: 'utility:number_input' },
    { label: '20', value: 20, checked: false, icon: 'utility:number_input' },
    { label: '50', value: 50, checked: false, icon: 'utility:number_input' },
  ];

  @track logLevelsSelected = {
    info:   false,
    debug:  false,
    warn:   false,
    error:  false
  };

  isSubscribeDisabled = false;
  isUnsubscribeDisabled = !this.isSubscribeDisabled;
  columns = defaultColumns;

  subscription = {};

  logsError;
  logsErrorJson;

  tailButton = {
    variant:  "brand-outline",
    label:    "Tail",
    iconName: "utility:play",
    title:    "Tail the logs",
  };

  paramsForGetLog = {
    cacheBuster: "1",
    logLevels: [],
    logsPerPage: 10,
    newLogsOnly: true,
    tailTimestamp: null
  };
  paramsForGetLogJson;

  get noLogs(){
    return !this.logs || !this.logs.length;
  }

  connectedCallback() {
    this.initializeLogLevels();
    this.initializeLogsPerPage();
  }

  initializeLogLevels() {
    const validLevels = ['info', 'debug', 'warn', 'error'];
    
    if (this.defaultLogLevels) {
        const levels = this.defaultLogLevels
            .replace(/\s+/g, '')
            .toLowerCase()
            .split(',')
            .filter(level => validLevels.includes(level));
 
        if (levels.length === 0) {
            this.paramsForGetLog.logLevels = ['INFO'];
            this.logLevelsSelected['info'] = true;
            return;
        }
 
        levels.forEach(level => {
            this.logLevelsSelected[level] = true;
        });
        this.paramsForGetLog.logLevels = levels.map(l => l.toUpperCase());
    } else {
        this.paramsForGetLog.logLevels = ['INFO'];
        this.logLevelsSelected['info'] = true;
    }
  }  

  initializeLogsPerPage() {
    // If admin configured a value, parse it; otherwise fallback to 10.
    const chosenValue = this.defaultLogsPerPage 
        ? parseInt(this.defaultLogsPerPage, 10) 
        : 10;
    this.paramsForGetLog.logsPerPage = chosenValue;

    // Mark the matching setting as checked.
    this.lppSettings = this.lppSettings.map(setting => ({
        ...setting,
        checked: setting.value === chosenValue
    }));
  }
  
  // working function, but would like to pass the NEW items to be highlighted to the logEntryItem component
  loadLogs() {
    this.paramsForGetLog.cacheBuster = (new Date()).getTime();
    console.log("Called loadLogs: " + JSON.stringify(this.paramsForGetLog));
    getLogs({ params: this.paramsForGetLog })
      .then(result => {
        this.logs = [];
        for (const appLog of result) {
          appLog.recordLink = "/" + appLog.Id;
          this.logs.push(appLog);
        }
        this.logsError = undefined;
        this.logsErrorJson = undefined;
      })
      .catch(error => {
        this.logsError = error;
        this.logsErrorJson = JSON.stringify(error);
        this.paramsForGetLogJson = JSON.stringify(this.paramsForGetLog);
      });
  }


  // track if the log levels have changed
  handleButtonClick(event) {
    let logLevel = event.target.name;

    // If turning off, check if it's the last one enabled
    if (this.logLevelsSelected[logLevel]) {
        const enabledCount = Object.values(this.logLevelsSelected)
            .filter(value => value).length;
            
        if (enabledCount <= 1) {
            this.showToast('Warning', 'At least one log level must remain selected', 'warning');
            return;
        }
    }

    // Update the selected state
    this.logLevelsSelected[logLevel] = !this.logLevelsSelected[logLevel];

    // Update params and reload if subscribed
    this.paramsForGetLog.logLevels = Object.entries(this.logLevelsSelected)
        .filter(([_, isSelected]) => isSelected)
        .map(([level, _]) => level.toUpperCase());

    if(this.isSubscribeDisabled || this.logs) {
        this.loadLogs();
    }
  }

  handleRowAction(event) {
    const action = event.detail.action;
    const row = event.detail.row;
    switch (action.name) {
      case "show_details":
        console.log("Showing Details: " + JSON.stringify(row));
        break;
      case "delete":
        console.log("Showing Delete: " + JSON.stringify(row));
        break;
    }
  }

  handleSettingLpp(event){
    for (let i in this.lppSettings){
      if(this.lppSettings[i].value === event.target.value){
          this.lppSettings[i].checked = true;
          this.paramsForGetLog.logsPerPage = event.target.value;
      } else {
        this.lppSettings[i].checked = false;
      }
    }
    //  if tailing, reload logs
    if(this.isSubscribeDisabled){
      this.loadLogs();
    }
  }

  toggleSubscribe(){
    this.isSubscribeDisabled = !this.isSubscribeDisabled;
    if (this.isSubscribeDisabled){
      this.handleSubscribe();
    } else {
      this.handleUnsubscribe();
    }
  }

  // Handles subscribe button click
 handleSubscribe() {
    const messageCallback = (response) => {
        console.log("New message received : ", JSON.stringify(response));
        this.payload = JSON.stringify(response);
        console.log("this.payload: " + this.payload);
        
        // Add delay to allow trigger to complete
        setTimeout(() => {
            this.loadLogsWithRetry();
        }, 500);
    };

    subscribe(CHANNEL_NAME, -1, messageCallback)
        .then(response => {
            console.log("Successfully subscribed to : ", JSON.stringify(response.channel));
            this.subscription = response;
            this.toggleSubscribeButton(true);
            this.paramsForGetLog.tailTimestamp = new Date().toISOString();
            this.tailButton.variant = "brand";
            this.tailButton.iconName = "utility:stop";
            this.tailButton.title = "Stop tailing the logs";
            this.tailButton.label = "Stop";
            this.showToast('Success', 'New log entries are now being tailed.', 'success');
        })
        .catch(error => {
            this.showToast('Error', 'Failed to subscribe to log updates: ' + error.message, 'error');
        });
  }

  loadLogsWithRetry(attempts = 3) {
    this.paramsForGetLog.cacheBuster = (new Date()).getTime();
    getLogs({ params: this.paramsForGetLog })
        .then(result => {
            this.logs = [];
            for (const appLog of result) {
                appLog.recordLink = "/" + appLog.Id;
                this.logs.push(appLog);
            }
            this.logsError = undefined;
            this.logsErrorJson = undefined;
        })
        .catch(error => {
            console.error('Error loading logs:', error);
            if (attempts > 0) {
                setTimeout(() => {
                    this.loadLogsWithRetry(attempts - 1);
                }, 1000);
            } else {
                this.logsError = error;
                this.logsErrorJson = JSON.stringify(error);
                this.paramsForGetLogJson = JSON.stringify(this.paramsForGetLog);
            }
        });
  }

  // Handles unsubscribe button click
  handleUnsubscribe() {
    this.toggleSubscribeButton(false);
    this.tailButton.variant = "brand-outline";
    this.tailButton.iconName = "utility:play";
    this.tailButton.title = "Tail the logs";
    this.tailButton.label = "Tail";
    this.paramsForGetLog.tailTimestamp = null;
    // Invoke unsubscribe method of empApi
    unsubscribe(this.subscription, response => {
      console.log("unsubscribe() response: ", JSON.stringify(response));
      // Response is true for successful unsubscribe
    });
  }

  toggleSubscribeButton(enableSubscribe) {
    this.isSubscribeDisabled = enableSubscribe;
    this.isUnsubscribeDisabled = !enableSubscribe;
  }

  clearLogs(){
    this.logs = undefined;
  }
  
  handleDeleteEntry(event) {
    const toDeleteId = event.detail.id;
    // Remove from logs array
    this.logs = this.logs.filter(entry => entry.Id !== toDeleteId);
    
    // Remove entry from database.
    deleteLog({ logId: toDeleteId })
      .then(result => {
        this.showToast('Success', 'Log entry deleted.', 'success');
        this.logsError = undefined;
        this.logsErrorJson = undefined;
        if(this.logs.length === 0){
          this.clearLogs();
        }
      })
      .catch(error => {
        this.showToast('Error', error, 'error');
        this.logsError = error;
        this.logsErrorJson = JSON.stringify(error);
        this.paramsForGetLogJson = JSON.stringify(this.paramsForGetLog);
      });
  }
  
  showToast(title, message, variant) {
    const event = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant
    });
    this.dispatchEvent(event);
  }
}
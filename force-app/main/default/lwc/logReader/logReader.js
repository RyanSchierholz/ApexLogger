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
  @api defaultLogLevels;      // e.g., "INFO,DEBUG,WARN"
  @api defaultLogsPerPage;    // e.g., 10

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
    logLevels: ["INFO", "DEBUG"],
    cacheBuster: "1",
    logsPerPage: 10
  };
  paramsForGetLogJson;

  get hasLogs() {
    return !!this.logs.length;
  }

  connectedCallback() {
    this.initializeLogLevels();
    this.initializeLogsPerPage();
  }

  initializeLogLevels() {
    // Split comma-separated string from property: "INFO,DEBUG,WARN"
    if (this.defaultLogLevels) {
        const levels = this.defaultLogLevels.toLowerCase().split(',');
        levels.forEach(level => {
            const trimmed = level.trim();
            if (this.logLevelsSelected.hasOwnProperty(trimmed)) {
                this.logLevelsSelected[trimmed] = true;
            }
        });
    }
  }

  initializeLogsPerPage() {
    // If admin configured a value, parse it; otherwise fallback to 10.
    const chosenValue = this.defaultLogsPerPage 
        ? parseInt(this.defaultLogsPerPage, 10) 
        : 10;

    // Mark the matching setting as checked.
    this.lppSettings = this.lppSettings.map(setting => ({
        ...setting,
        checked: setting.value === chosenValue
    }));
  }
  
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
        //console.log("log success: " + this.logs);
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
    this.logLevelsSelected[logLevel] = !this.logLevelsSelected[logLevel];
    //console.log(JSON.stringify(this.logLevelsSelected));
    this.handleButtonChange();
  }

  //  NO LONGER USED
  // handleButtonChange() {
  //   let logLevelData = [];
  //   for (const [logLevel, isSelected] of Object.entries(this.logLevelsSelected)) {
  //     if (isSelected) {
  //       logLevelData.push(logLevel.toUpperCase());
  //     }
  //   }

  //   this.paramsForGetLog.logLevels = logLevelData;
  //   this.loadLogs();
  // }

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

  //  NOT USED
  // handleLogsPerPageChange(event) {
  //   this.logsPerPage = event.detail.value;
  //   this.paramsForGetLog.logsPerPage = this.logsPerPage;
  //   this.loadLogs();
  // }

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
    // Callback invoked whenever a new event message is received
    const messageCallback = (response) => {
      console.log("New message received : ", JSON.stringify(response));
      this.payload = JSON.stringify(response);
      console.log("this.payload: " + this.payload);
      // Response contains the payload of the new message received
      this.loadLogs();
    };

    // Invoke subscribe method of empApi. Pass reference to messageCallback
    subscribe(CHANNEL_NAME, -1, messageCallback)
      .then(response => {
        // Response contains the subscription information on successful subscribe call
        console.log("Successfully subscribed to : ", JSON.stringify(response.channel));
        this.subscription = response;
        this.toggleSubscribeButton(true);
        this.tailButton.variant = "brand";
        this.tailButton.iconName = "utility:stop";
        this.tailButton.title = "Stop tailing the logs";
        this.tailButton.label = "Stop";
        this.showToast('Success', 'New log entries are now being tailed.', 'success');
      });
  }

  // Handles unsubscribe button click
  handleUnsubscribe() {
    this.toggleSubscribeButton(false);
    this.tailButton.variant = "brand-outline";
    this.tailButton.iconName = "utility:play";
    this.tailButton.title = "Tail the logs";
    this.tailButton.label = "Tail";

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

  showToast(title, message, variant) {
    const event = new ShowToastEvent({
        title: title,
        message: message,
        variant: variant
    });
    this.dispatchEvent(event);
  }
}
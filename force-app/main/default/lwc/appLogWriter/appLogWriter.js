// appLogWriter.js
/**
 * @fileOverview Write Platform Events to demo the  Log Reader
 * @author Ryan Schierholz <github.com/RyanSchierholz>
 * @contributor Claude <anthropic.com>
 *
 */
import { LightningElement } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import debug from "@salesforce/apex/LogService.debug";
import info from "@salesforce/apex/LogService.info";
import warn from "@salesforce/apex/LogService.warn";
//import error from '@salesforce/apex/LogService.error'; //not permited. Use LogUiController
import insertLogPe from "@salesforce/apex/LogUiController.insertLogPe";

export default class AppLogWriter extends LightningElement {
  message = "";
  loading = false;
  
  get logLevelOptions() {
    return [
      { label: "INFO", value: "INFO", iconName: "utility:info" },
      { label: "DEBUG", value: "DEBUG", iconName: "utility:bug" },
      { label: "WARN", value: "WARN", iconName: "utility:warning" },
      { label: "ERROR", value: "ERROR", iconName: "utility:error" }
    ];
  }

  handleMessageChange(event) {
    this.message = event.target.value;
  }

  async handleSubmit(event) {
    this.loading = true;
    try {
      const className = "AppLogWriter.component";
      let msg = this.message.length > 0 ? this.message : '[no message provided]';

      switch (event.target.value) {
        case "DEBUG":
          await debug({ message: msg, className: className });
          break;
        case "INFO":
          await info({ message: msg, className: className });
          break;
        case "WARN":
          await warn({ message: msg, className: className });
          break;
        case "ERROR":
          await insertLogPe({ level: "ERROR", message: msg, cls: className });
          break;
      }

      this.showToast("Success", "Log entry created successfully", "success");
      this.clearForm();
    } catch (error) {
      this.showToast(
        "Error",
        "Error creating log entry: " + error.message,
        "error"
      );
    } finally {
      this.loading = false;
    }
  }

  clearForm() {
    this.message = "";
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

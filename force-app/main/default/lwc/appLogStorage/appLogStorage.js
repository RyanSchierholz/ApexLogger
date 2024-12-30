/**
 * Get number of App Log records and oldest creation date per log level,
 * with additional filtering by date range and deletion capabilities
 * @author mikelockett
 * @contributors Ryan Schierholz (added date filtering, log deletion, and automatic refresh)
 * @date Original: 6/3/23, Updated: 12/2/23
 * @features
 * - Aggregate log counts by level (INFO, DEBUG, WARN, ERROR)
 * - Filter logs by date ranges (Today through Last Year)
 * - Delete logs by level within selected date range
 * - Auto-refresh data at configurable intervals
 * - Default view shows current week's logs
 */

import { LightningElement, api, track } from "lwc";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getLogCountByLevelDate from "@salesforce/apex/LogUiController.getLogCountByLevelDate";
import deleteLogsByLevel from "@salesforce/apex/LogUiController.deleteLogsByLevel";
import getLogsByDateLevel from "@salesforce/apex/LogUiController.getLogsByDateLevel";

export default class AppLogStorage extends LightningElement {
  // Public properties
  @api refreshInterval;
  @api defaultDateFilter = "THIS_WEEK";

  @api
  set chartType(value) {
    const validTypes = ["line", "bar", "stackedBar", "area"];
    this._chartType = validTypes.includes(value) ? value : "off";
  }

  get chartType() {
    return this._chartType;
  }

  // Private reactive properties
  @track logData = undefined;
  @track selectedDateFilter = "THIS_WEEK";
  @track isLoading = false;
  @track error;
  @track title = "App Log Storage";

  @track logChartData = undefined;

  showChart = false;
  noData = true;
  // Private non-reactive properties
  refreshTimerId;

  // Getters for template
  get dateFilterOptions() {
    return DATE_FILTER_OPTIONS;
  }

  get hasError() {
    return !!this.error;
  }

  get noDataMessage() {
    return this.isLoading
      ? "Loading..."
      : "No logs found for the selected time period.";
  }
  get selectedDateLabel() {
    const selected = this.dateFilterOptions.find(
      (option) => option.value === this.selectedDateFilter
    );
    return selected ? selected.label : "All Time";
  }
  get dateFilterOptions() {
    return [
      {
        label: "Today",
        value: "TODAY",
        checked: this.selectedDateFilter === "TODAY"
      },
      {
        label: "Yesterday",
        value: "YESTERDAY",
        checked: this.selectedDateFilter === "YESTERDAY"
      },
      {
        label: "This Week",
        value: "THIS_WEEK",
        checked: this.selectedDateFilter === "THIS_WEEK"
      },
      {
        label: "Last Week",
        value: "LAST_WEEK",
        checked: this.selectedDateFilter === "LAST_WEEK"
      },
      {
        label: "This Month",
        value: "THIS_MONTH",
        checked: this.selectedDateFilter === "THIS_MONTH"
      },
      {
        label: "Last Month",
        value: "LAST_MONTH",
        checked: this.selectedDateFilter === "LAST_MONTH"
      },
      {
        label: "This Year",
        value: "THIS_YEAR",
        checked: this.selectedDateFilter === "THIS_YEAR"
      },
      {
        label: "Last Year",
        value: "LAST_YEAR",
        checked: this.selectedDateFilter === "LAST_YEAR"
      },
      {
        label: "All Time",
        value: null,
        checked: this.selectedDateFilter === null
      }
    ];
  }

  // Lifecycle hooks
  connectedCallback() {
    this.selectedDateFilter = this.defaultDateFilter;
    this.showChart = this.chartType === "off" ? false : true;
    this.loadLogData();
  }

  disconnectedCallback() {
    this.stopRefreshTimer();
  }

  // Event handlers
  handleDateFilterChange(event) {
    this.selectedDateFilter = event.detail.value;
    this.loadLogData();
  }

  handleRefreshClick() {
    this.loadLogData();
  }

  async handleDeleteClick(event) {
    const logLevel = event.target.dataset.level;
    const result = await this.showDeleteConfirmation(logLevel);

    if (result) {
      try {
        this.isLoading = true;
        await deleteLogsByLevel({
          logLevel: logLevel,
          relDateFilter: this.selectedDateFilter
        });
        this.showToast(
          "Success",
          `Successfully deleted ${logLevel} logs`,
          "success"
        );
        await this.loadLogData();
      } catch (error) {
        this.handleError(error, `Error deleting ${logLevel} logs`);
      } finally {
        this.isLoading = false;
      }
    }
  }

  // Private methods
  async loadLogData() {
    this.isLoading = true;
    this.stopRefreshTimer();
    try {
      this.error = undefined;
      const results = await getLogCountByLevelDate({
        relDateFilter: this.selectedDateFilter
      });
      if(results.length > 0){
        const chartResults = await getLogsByDateLevel({
          relDateFilter: this.selectedDateFilter
        });
        this.processLogData(results);
        this.processLogChartData(chartResults);
        this.noData = false;
      }else{
        this.noData = true;
        console.log('noData');
      }
      
    } catch (error) {
      this.handleError(error, "Error loading log data");
    } finally {
      this.title = "Logs " + this.selectedDateLabel;
      this.startRefreshTimer();
      this.isLoading = false;
    }
  }

  processLogChartData(results) {
    // First, determine date range
    const dates = results.map(r => new Date(r.CreatedDate));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    // Create object with all dates initialized
    let newChartData = {};
    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        newChartData[dateStr] = {
            'INFO': 0,
            'DEBUG': 0,
            'WARN': 0,
            'ERROR': 0
        };
    }

    // Fill in actual data
    results.forEach((result) => {
        const date = result.CreatedDate;
        const level = result.level;
        newChartData[date][level] = result.logCount;
    });

    if (JSON.stringify(newChartData) !== JSON.stringify(this.logChartData)) {
        this.logChartData = newChartData;
    }
  }

  processLogData(results) {
    // Ensure all log levels are represented
    const processedData = [
      {
        level: "INFO",
        count: 0,
        firstDate: null,
        iconName: "utility:info",
        deleteTitle: "Delete INFO logs"
      },
      {
        level: "DEBUG",
        count: 0,
        firstDate: null,
        iconName: "utility:bug",
        deleteTitle: "Delete DEBUG logs"
      },
      {
        level: "WARN",
        count: 0,
        firstDate: null,
        iconName: "utility:warning",
        deleteTitle: "Delete WARN logs",
        variant: "warning"
      },
      {
        level: "ERROR",
        count: 0,
        firstDate: null,
        iconName: "utility:error",
        deleteTitle: "Delete ERROR logs",
        variant: "error"
      }
    ];

    // Update counts for existing data
    results.forEach((result) => {
      const existingLevel = processedData.find(
        (item) => item.level === result.LogLevel__c
      );
      if (existingLevel) {
        existingLevel.count = result.LogCount;
        existingLevel.firstDate = result.FirstCreatedDate;
      }
    });

    this.logData = processedData;
  }

  startRefreshTimer() {
    if (this.refreshInterval) {
      this.refreshTimerId = setInterval(() => {
        this.loadLogData();
      }, this.refreshInterval * 1000);
    }
  }

  stopRefreshTimer() {
    if (this.refreshTimerId) {
      clearInterval(this.refreshTimerId);
    }
  }

  showDeleteConfirmation(logLevel) {
    // Use lightning-confirm when available in your org
    return new Promise((resolve) => {
      if (
        confirm(
          `Are you sure you want to delete all ${logLevel} logs for the selected time period?`
        )
      ) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  }

  showToast(title, message, variant) {
    const event = new ShowToastEvent({
      title,
      message,
      variant
    });
    this.dispatchEvent(event);
  }

  handleError(error, fallbackMessage) {
    this.error = error.body?.message || error.message || fallbackMessage;
    this.showToast("Error", this.error, "error");
    console.error("Error:", error);
  }
}

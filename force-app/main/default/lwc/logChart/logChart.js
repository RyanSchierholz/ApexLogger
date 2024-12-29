/**
 * @fileOverview Chart component for App Logs
 * @author Ryan Schierholz <github.com/RyanSchierholz>
 * @contributor Claude <anthropic.com>
 *
 * Displays log data in various chart formats:
 * - Line chart
 * - Bar chart
 * - Stacked bar chart
 * - Area chart
 *
 * Uses Chart.js library with dynamic data updates and timezone support.
 * logData provided from appLogStorage.
 */
import { LightningElement, api } from "lwc";
import { loadScript } from "lightning/platformResourceLoader";
import chartjs from "@salesforce/resourceUrl/chartJs";

/**
 * When using this component in an LWR site, please import the below custom implementation of 'loadScript' module
 * instead of the one from 'lightning/platformResourceLoader'
 *
 * import { loadScript } from 'c/resourceLoader';
 *
 * This workaround is implemented to get around a limitation of the Lightning Locker library in LWR sites.
 * Read more about it in the "Lightning Locker Limitations" section of the documentation
 * https://developer.salesforce.com/docs/atlas.en-us.exp_cloud_lwr.meta/exp_cloud_lwr/template_limitations.htm
 */

export default class LogChart extends LightningElement {
  @api
  set logData(value) {
    this._logData = value;
    if (this.chart) {
      this.chart.data = this.config.data;
      this.chart.update();
    }
  }

  get logData() {
    return this._logData;
  }

  @api chartType = "bar"; // Default type
  error;
  chart;
  chartjsInitialized = false;

  get config() {
    const dates = Object.keys(this.logData);
    const levels = ["INFO", "DEBUG", "WARN", "ERROR"];
    const colors = {
      INFO: "#0176d3",
      DEBUG: "#06a59a",
      WARN: "#ffa500",
      ERROR: "#ff0000"
    };

    const baseConfig = {
      labels: dates,
      datasets: levels.map((level) => ({
        label: level,
        data: dates.map((date) => this.logData[date][level] || 0),
        backgroundColor:
          this.chartType === "line" ? "transparent" : colors[level],
        borderColor: colors[level],
        borderWidth: this.chartType === 'bar' ? 0 : null,
        borderRadius: this.chartType === 'bar' ? 4 : null,
        borderSkipped: this.chartType === 'bar' ? 'bottom' : false,
        fill: this.chartType === "area",
        tension:  this.chartType === "line" ? 0.1 : null
      }))
    };

    if (this.chartType === "area") {
      baseConfig.datasets = baseConfig.datasets.map((dataset) => ({
        ...dataset,
        backgroundColor: dataset.borderColor + "80"
      }));
    }

    //  NEXT: check if stackedBar works - YES

    const t =
      this.chartType === "stackedBar"
        ? "bar"
        : this.chartType === "area"
        ? "line"
        : this.chartType;
    return {
      type: t,
      data: baseConfig,
      options: {
        responsive: true,
        scales: {
          y: {
            ticks: {
              stepSize: 1
            },
            beginAtZero: true,
            stacked: ["stackedBar", "area"].includes(this.chartType)
          },
          x: { stacked: this.chartType === "stackedBar" }
        },
        plugins: {
          legend: { display: false }
        }
      }
    };
  }

  async renderedCallback() {
    if (this.chartjsInitialized || !this.logData) return;
    this.chartjsInitialized = true;

    try {
      await loadScript(this, chartjs);
      const canvas = document.createElement("canvas");
      this.template.querySelector("div.chart").appendChild(canvas);
      const ctx = canvas.getContext("2d");
      this.chart = new window.Chart(ctx, this.config);
    } catch (error) {
      this.error = error;
    }
  }
}

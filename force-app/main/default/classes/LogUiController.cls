/**
 * @description 
 *
 * @author mikelockett 
 * @date 2020-03-16
 */

public without sharing class LogUiController {
	@AuraEnabled
	public static List<AppLog__c> getLogs(LogParamWrapper params) {
		System.debug(params);
		String query = 'SELECT AffectedId__c, Class__c, CreatedDate, '
				+ 'Id, LogLevel__c, Message__c, Name, ShortMessage__c '
				+ 'FROM AppLog__c '
				+ 'WHERE LogLevel__c IN (\'' + String.join(params.logLevels, '\',\'') + '\')';
		if (params.newLogsOnly == true) {
			query += ' AND CreatedDate > ' + params.tailTimestamp;
		}
	
		query += ' ORDER BY CreatedDate DESC '
				+ ' LIMIT ' + params.logsPerPage;
		system.debug('Query: ' + query);
		return Database.query(query);
	}

	@AuraEnabled
	public static List<AggregateResult> getLogCountByLevel(){
		List<AggregateResult> results = [
				SELECT COUNT(Id) LogCount, MIN(CreatedDate) FirstCreatedDate, LogLevel__c
				FROM AppLog__c
				GROUP BY LogLevel__c
				ORDER BY LogLevel__c];
		return results;
	}

	@AuraEnabled
	public static void insertLog(String level,String message,String cls){
			
		AppLog__c log = new AppLog__c();
		log.LogLevel__c = level;
		log.Message__c = message;
		log.ShortMessage__c = message.left(255);
		log.Class__c = cls;
		insert log;
	}

	// insert a lot platform event
	@AuraEnabled
	public static void insertLogPe(String level,String message,String cls){
			
		EventBus.publish(new AppLogEvent__e(
			LogLevel__c = level,
			Message__c = message,
			Class__c = cls
			));
	}

	@AuraEnabled
	public static List<AggregateResult> getLogCountByLevelDate(String relDateFilter){
		// Valid filters list
		Set<String> validFilters = new Set<String>{
			'TODAY',
			'YESTERDAY',
			'THIS_WEEK', 
			'LAST_WEEK', 
			'THIS_MONTH', 
			'LAST_MONTH', 
			'THIS_YEAR', 
			'LAST_YEAR'
		};

		// Validate input
		if (relDateFilter != null && !validFilters.contains(relDateFilter.toUpperCase())) {
			throw new AuraHandledException('Invalid date filter provided');
		}

		String query = 'SELECT COUNT(Id) LogCount, MIN(CreatedDate) FirstCreatedDate, LogLevel__c '
				+ 'FROM AppLog__c ';
		
		// Add date filter if provided (null means ALL TIME)
		if (validFilters.contains(relDateFilter)) {
			query += ' WHERE CreatedDate = ' + relDateFilter;  // Use the literal directly in SOQL
		}
		// Order by custom order: INFO, DEBUG, WARN, ERROR
		query += ' GROUP BY LogLevel__c '
				+ 'ORDER BY LogLevel__c ';

		return Database.query(query);
	}

	@AuraEnabled
	public static List<AggregateResult> getLogsByDateLevel(String relDateFilter) {
		system.debug('relDateFilter: ' + relDateFilter);
		// Valid filters list
		Set<String> validFilters = new Set<String>{
			'TODAY',
			'YESTERDAY',
			'THIS_WEEK', 
			'LAST_WEEK', 
			'THIS_MONTH', 
			'LAST_MONTH', 
			'THIS_YEAR', 
			'LAST_YEAR'
		};

		// Validate input
		if (relDateFilter != null && !validFilters.contains(relDateFilter.toUpperCase())) {
			throw new AuraHandledException('Invalid date filter provided');
		}

		String query = 'SELECT DAY_ONLY(convertTimezone(CreatedDate)) CreatedDate, LogLevel__c level, COUNT(Id) logCount '
						+ 'FROM AppLog__c ';
		// Add date filter if provided (null means ALL TIME)
		if (validFilters.contains(relDateFilter)) {
			query += ' WHERE CreatedDate = ' + relDateFilter;  // Use the literal directly in SOQL
		}
		query += ' GROUP BY DAY_ONLY(convertTimezone(CreatedDate)), LogLevel__c '
				+ 'ORDER BY DAY_ONLY(convertTimezone(CreatedDate))';

		system.debug('Query: ' + query);
		return Database.query(query);
	}

	@AuraEnabled
	public static void deleteLog(String logId) {
		try {
			delete new AppLog__c(Id = logId);
		} catch (Exception e) {
			throw new AuraHandledException('Error deleting log: ' + e.getMessage());
		}
	}

	@AuraEnabled
	public static void deleteLogsByLevel(String logLevel, String relDateFilter) {
		system.debug('Deleting logs with log level: ' + logLevel + ' and date filter: ' + relDateFilter);
		// Valid filters list
		Set<String> validFilters = new Set<String>{
			'TODAY',
			'YESTERDAY',
			'THIS_WEEK', 
			'LAST_WEEK', 
			'THIS_MONTH', 
			'LAST_MONTH', 
			'THIS_YEAR', 
			'LAST_YEAR'
		};

		// Validate inputs
		if (String.isBlank(logLevel)) {
			throw new AuraHandledException('Log level must be specified');
		}
		if (relDateFilter != null && !validFilters.contains(relDateFilter.toUpperCase())) {
			throw new AuraHandledException('Invalid date filter provided');
		}

		String query = 'SELECT Id FROM AppLog__c WHERE LogLevel__c = :logLevel';
		
		// Add date filter if provided (null means ALL TIME)
		if (relDateFilter != null) {
			query += ' AND CreatedDate = ' + relDateFilter;
		}
		try {
			List<AppLog__c> logsToDelete = Database.query(query);
			delete logsToDelete;
		} catch (Exception e) {
			throw new AuraHandledException('Error deleting logs: ' + e.getMessage());
		}
	}

	public class LogParamWrapper {
		@AuraEnabled
		public List<String> logLevels { get; set; }
		@AuraEnabled
		public String cacheBuster { get; set; }
		@AuraEnabled
		public Integer logsPerPage { get; set; }
		@AuraEnabled
		public Boolean newLogsOnly { get; set; }
		@AuraEnabled
		public String tailTimestamp { get; set; }
	}
}
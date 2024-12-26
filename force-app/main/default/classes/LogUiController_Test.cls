/**
 * Test class for LogController
 * @author mikelockett
 * @date 6/3/23.
 */

@IsTest
public with sharing class LogUiController_Test {

    @TestSetup 
    static void setup() {
        List<AppLog__c> logs = new List<AppLog__c>();
        logs.add(new AppLog__c(LogLevel__c = 'DEBUG', Message__c = 'Test Debug'));
        logs.add(new AppLog__c(LogLevel__c = 'ERROR', Message__c = 'Test Error'));
        logs.add(new AppLog__c(LogLevel__c = 'WARN', Message__c = 'Test Warning'));
        insert logs;
    }

    @IsTest
    static void getReturnsRecords() {
        LogService_Test.testSetup();
       
        // create params
        LogUiController.LogParamWrapper params = new LogUiController.LogParamWrapper();
        params.logLevels = new List<String>{
                'Error'
        };
        params.logsPerPage = 10;
        params.cacheBuster = 'anything';

        List<AppLog__c> appLogs = LogUiController.getLogs(params);
        Assert.areEqual(1, appLogs.size());
    }

    @IsTest
    static void getLogCountByLevelReturnCorrectValues() {
        LogService_Test.testSetup();

        // call system under test
        List<AggregateResult> results = LogUiController.getLogCountByLevel();

        // expect 2 results
        Assert.areEqual(3, results.size());

        // expect 1 error log
        Integer logCount = Integer.valueOf(results[1].get('LogCount'));
        String logLevel = String.valueOf(results[1].get('LogLevel__c'));

        Assert.areEqual('ERROR', logLevel.toUpperCase());
        Assert.areEqual(1, logCount);

        // expect 1 warn log
        Integer logCount2 = Integer.valueOf(results[2].get('LogCount'));
        String logLevel2 = String.valueOf(results[2].get('LogLevel__c'));

        Assert.areEqual('WARN', logLevel2.toUpperCase());
        Assert.areEqual(1, logCount2);
    }

    @IsTest
    static void testDeleteLog() {
        AppLog__c log = [SELECT Id FROM AppLog__c LIMIT 1];
        
        Test.startTest();
        LogUiController.deleteLog(log.Id);
        Test.stopTest();
        
        List<AppLog__c> remainingLogs = [SELECT Id FROM AppLog__c WHERE Id = :log.Id];
        System.assertEquals(0, remainingLogs.size());
    }

    @IsTest
    static void testDeleteLogsByLevel() {
        Test.startTest();
        LogUiController.deleteLogsByLevel('DEBUG', 'TODAY');
        Test.stopTest();
        
        List<AppLog__c> remainingLogs = [SELECT Id FROM AppLog__c WHERE LogLevel__c = 'DEBUG'];
        System.assertEquals(0, remainingLogs.size());
    }

    @IsTest
    static void testGetLogCountByLevelDate() {
        Test.startTest();
        List<AggregateResult> results = LogUiController.getLogCountByLevelDate('TODAY');
        Test.stopTest();
        
        System.assertNotEquals(0, results.size());
    }
}
# ApexLogger
For adding persistent log functionality to Apex.

This is a very basic class to give the ability to write persistent logs to the 
database. Because it uses Platform Events, the database transaction for writing a 
log does not get rolled back in the case of a failed transaction.

### Features

Enables a developer to write log data to the database without concern for data
being rolled back on error.

Provides both static methods, and a concrete class that implements an interface 
developers that might want to mock logging in tests, or provide other loggers.

### Usage
#### Using static methods
`LogService.debug('my dedug text', 'class/method');` 
`LogService.debug('my dedug text', 'class/method', affectedId);` 
`LogService.warn('my waring text', 'class/method');` 
`LogService.warn('my waring text', 'class/method', affectedId);` 
`LogService.error('my error text', 'class/method');`
`LogService.error('my error text', 'class/method', affectedId);` 
`LogService.error(myException, 'class/method');` 
`LogService.error(myException, 'class/method', affectedId);` 

Exception example:

    try{
       Account acct = [SELECT Id FROM Account WHERE Id=:id];
    } catch( Exception ex ){
       LogService.error( ex, 'class/method');
    }

#### Using Logger instance
    @TestVIsible
    ILogger log = new Logger(); // this allows you to switch to any ILogger for testing
    
    log.debug('my dedug text', 'class/method');  
    log.debug('my dedug text', 'class/method', affectedId);
    log.warn('my waring text', 'class/method');
    log.warn('my waring text', 'class/method', affectedId);
    log.error('my error text', 'class/method');
    log.error('my error text', 'class/method', affectedId);
    log.error(myException, 'class/method');
    log.error(myException, 'class/method', affectedId);

### Installation

* You can use clone the repo, then use _ant_ or your favorite IDE to deploy.  
* You might consider creating an unlocked package and deploying it.  
* Or use this handy link: 
[![Deploy](https://raw.githubusercontent.com/afawcett/githubsfdeploy/master/src/main/webapp/resources/img/deploy.png)](ttps://githubsfdeploy.herokuapp.com/app/githubdeploy/mlockett/ApexLogger)

### History
| Date       |Features |  
| :-------- | :--- |  
| 2018-11-18 | Initial commit  |  
| 2019-02-18 | Added _Logger_ instance class, and _ILogger_ interface, allowing more versatility in object instantiation, and inheritance. |

### Future  
In this first version, there is nothing built in to remove old logs, since 
the desired duration of logs would be different per org.

In the future, I might add the ability to configure which types of issues 
are actually logged (e.g. DEBUG, ERROR, etc.).

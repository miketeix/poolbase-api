module.exports = {
  /**
   * Application configuration section
   * http://pm2.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [

    // First application
    {
      name      : 'poolbase-api',
      script    : 'build/index.js',
      env: {
        COMMON_VARIABLE: 'true'
      },
      env_production : {
        NODE_ENV: 'production'
      },
      env_staging : {
        NODE_ENV: 'staging'
      }
    },

    // Second application
    // {
    //   name      : 'WEB',
    //   script    : 'web.js'
    // }
  ],

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   */
  deploy : {
    production : {
      user : 'ec2-user',
      host : '212.83.163.1',
      ref  : 'origin/develop',
      repo : 'git@bitbucket.org:felixpool/poolbase-api.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    },
    staging : {
      user : 'ec2-user',
      host : '212.83.163.1',
      ref  : 'origin/develop',
      repo : 'git@bitbucket.org:felixpool/poolbase-api.git',
      path : '/var/www/staging',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env staging',
      env  : {
        NODE_ENV: 'staging'
      }
    }
  }
};

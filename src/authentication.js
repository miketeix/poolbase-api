import authentication from 'feathers-authentication';
import jwt from 'feathers-authentication-jwt';
import local from '@feathersjs/authentication-local';
import web3 from './authenticationWeb3';

export default function() {
  const app = this;
  const config = app.get('authentication');

  // Set up authentication with the secret
  app.configure(authentication(config));
  app.configure(jwt());
  app.configure(web3());
  app.configure(local());

  // The `authentication` service is used to create a JWT.
  // The before `create` hook registers strategies that can be used
  // to create a new valid JWT (e.g. local or oauth2)
  app.service('authentication').hooks({
    before: {
      create: [authentication.hooks.authenticate(config.strategies)],
      remove: [authentication.hooks.authenticate('jwt')],
    }
  });
}

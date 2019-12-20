import React, { Component } from 'react';
import { UserManager } from 'oidc-client';
import { getClientSettings } from '../lib';

export default class extends Component {

  state = { isLogged: false }

  login = async () => {
    const manager = new UserManager(getClientSettings());
    manager.signinRedirect();
  }

  logout = async () => {
    const manager = new UserManager(getClientSettings());
    manager.signoutRedirect();
  }

  async componentDidMount() {
    const manager = new UserManager(getClientSettings());
    const user = await manager.getUser();
    this.setState({ isLogged: !!(user && !user.expired) });
  }

  render() {
    return (
      <div>
        {this.state.isLogged ?
          <button onClick={this.logout}>logout</button> :
          <button onClick={this.login}>login</button>}
      </div>
    );
  }
}
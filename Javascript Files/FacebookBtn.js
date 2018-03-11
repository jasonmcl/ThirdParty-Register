import React from 'react';
import axios from 'axios';
import { withRouter } from 'react-router';
import { connect } from 'react-redux';
import { createUser } from '../../actions/index';
import { bindActionCreators } from 'redux';

/*
    Facebook Code
    Creates the script tag and inserts it in the html
*/
(function (d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement(s);
    js.id = id;
    js.src = "https://connect.facebook.net/en_US/sdk.js";
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

class FacebookBtn extends React.Component {
    constructor(props) {
        super(props);
    }

    componentWillMount = () => {
        //Gets the API key from the server
        axios.get("/api/thirdPartyLogin/apikey/facebook")
        .then(resp => {
            let apiKey = resp.data.item;
            window.fbAsyncInit = function () {
                FB.init({
                    appId: apiKey,
                    autoLogAppEvents: true,
                    xfbml: true,
                    version: 'v2.11'
                });
            };
    
        })
    }

    redirect = (user) => {
        for (let i = 0; i < user.roles.length; i++) {
            //If the user has the admin role, redirect them to the admin dashboard
            if (user.roles[i] == "Admin") {
                window.location.href = "";
            }
        }
        //The the user doesn't have the admin dashboard, redirect them to the regular user dashboard
        if (user.roles[user.roleslength-1] !== "Admin" ) {
            this.props.router.push('/userdashboard');
        }
    }

    //Called when the user clicks the sign up with facebook button
    handleClick = () => {
        //Calls the facebook login function
        FB.login( response => {
            //If the response comes back with an authResponse it was successful
            if(response.authResponse) {
                //Get the current user information from redux if they're registering
                let currUserName = this.props.user;
                //If the information is null, they aren't registering
                if(currUserName === null) {
                    //Assign create an object of empty strings for the current user info
                    currUserName = {
                        firstName: "",
                        middleInitial: "",
                        lastName: "",
                        dob: ""
                    }
                }

                //Data object to send to server for registration or login
                let regData = {
                    //Get from Redux
                    FirstName: currUserName.firstName,
                    MiddleInitial: currUserName.middleInitial,
                    LastName: currUserName.lastName,
                    DOB: currUserName.dob,
                    //Passed down from register
                    Role: this.props.selectedRole,
                    //Email will be set on server from facebook
                    Email: "",
                    //Recieved from fb - used to get user info on server
                    AccessToken: response.authResponse.accessToken
                }

                axios.post('/api/thirdPartyLogin/facebook', regData)
                .then(resp => {
                    //If the registration/login was successful, set the user in redux to the logged in user, and redirect them
                    let user = resp.data.item;
                    this.props.createUser(user);
                    this.redirect(user);
                })
                .catch(err => {
                    //If there was an error pass it back to the parent function
                    this.props.loginError(err.response.data.message);
                });
            }
        }, {
            scope: 'email',
            return_scopes: true
        });
    }

    render() {
        //Changes the button text from sign in to sign up depending on if it's the registration or login page
        let isLogin = this.props.selectedRole === null ? 'in' : 'up';
        return (
            <div id="fb-root">
                <button onClick={this.handleClick} type="button" className="btn btn-lg btn-block btn-login-fb">
                    <i className="fa fa-facebook" aria-hidden="true"></i> {'Sign ' + isLogin + ' with Facebook'}
                </button>
            </div>
        );
    }
}

function mapStateToProps(state){
    //Lets us get the user information from redux
    return { 
        user: state.user
    }
}

function mapDispatchToProps(dispatch){
    //Lets us set the current user information in redux
    return bindActionCreators({ createUser}, dispatch)
}
//withRouter - used for redirection using props.router.push
//connect - lets the class connect to redux to get/set the user info
export default withRouter(connect(mapStateToProps, mapDispatchToProps)(FacebookBtn));
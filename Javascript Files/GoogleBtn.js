import React from 'react';
import axios from 'axios';
import { withRouter } from 'react-router';
import { connect } from 'react-redux';
import { createUser } from '../../actions/index';
import { bindActionCreators } from 'redux';

class GoogleBtn extends React.Component{
    constructor(props){
        super(props);
    }
    
    componentDidMount() {
        //Calls the initialize function after the button mounts
        this.init(); 
    }

    init = () => {
        //Loads the google api
        gapi.load('auth2', () => { 
            this.auth2 = gapi.auth2.init({
                client_id: ''/* Client Id */,
                cookiepolicy: 'single_host_origin',
            });
            //Calls the attachSignin function passing in this button
            this.attachSignin(document.getElementById(this.props.id));
        });
    }
 
    attachSignin = (element) => {
        var googleUser ={};
        //Attaches a google click handler to the button
        this.auth2.attachClickHandler(element, {},
            (googleUser) => {
                this.onSignIn(googleUser);
            });
    }

    redirect = (user) => {
        for (let i = 0; i < user.roles.length; i++) {
            //If the user has the admin role, redirect them to the admin dashboard
            if (user.roles[i] == "Admin") {
                window.location.href = "";
            }
        }
        //The the user doesn't have the admin dashboard, redirect them to the regular user dashboard
        if (user.roles[user.roles.length-1] !== "Admin" ) {
            this.props.router.push('/userdashboard');
        }
    }
    
    //Called after the user signs in with google
    onSignIn =(googleUser) => {
        //Gets basic profile info
        var profile = googleUser.getBasicProfile();
        //Gets the google id
        var id_token = googleUser.getAuthResponse().id_token;
        var data = {
            tokenId: id_token
        };
        //Sends the id token to the server to authorize it with google
        axios.post('/api/googleauth', data)
            .then(response => { 
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
                const regModel = {
                    //Get from Redux
                    FirstName: currUserName.firstName,
                    MiddleInitial: currUserName.middleInitial,
                    LastName: currUserName.lastName,
                    DOB: currUserName.dob,
                    //Get from Google
                    Email: response.data.email,
                    ProviderId: response.data.providerUserId,
                    //Passed in by registration
                    Role: this.props.selectedRole,
                };
                //Sends the information to the server for registration/login
                axios.post('/api/thirdPartyLogin/google', regModel)
                    .then(resp => {
                        //If the registration/login was successful, set the user in redux to the logged in user, and redirect them
                        let user = resp.data.item;
                        this.props.createUser(user);
                        this.redirect(user);
                    })
                    .catch(err => {
                        //If there was an error pass it back to the parent function
                        this.props.loginError(err);
                    });
            })
    }

    render(){
        //Changes the button text from sign in to sign up depending on if it's the registration or login page
        let isLogin = this.props.selectedRole === null ? 'in' : 'up';
        return(
            <button type="button" className="btn btn-lg btn-block btn-login-g" id={this.props.id}>
                <i className="fa fa-google-plus" aria-hidden="true"></i> {'Sign ' + isLogin + ' with Google'}
            </button>
        )
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
export default withRouter(connect(mapStateToProps, mapDispatchToProps)(GoogleBtn));

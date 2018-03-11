import React from 'react';
import axios from 'axios';
import { withRouter } from 'react-router';
import { connect } from 'react-redux';
import { createUser } from '../../actions/index';
import { bindActionCreators } from 'redux';

class LinkedInBtn extends React.Component{
    constructor(props) {
        super(props);
    }

    componentWillMount() {
        //Get the api key before the button mounts
        axios.get('/api/thirdPartyLogin/apikey/linkedin')
        .then(resp => {
            //Initialize linked in api with the recieved api key
            let apiKey = resp.data.item;
            IN.init({
                api_key: apiKey,
                authorize: false
            });
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
        if (user.roles[user.roleslength-1] !== "Admin" ) {
            this.props.router.push('/userdashboard');
        }
    }

    //Called when the linked in button is clicked
    handleLinkedInClick = () => {
        //Authorize the user
        IN.User.authorize(
            () => {
                //Get the Id and Email Address from the user
                IN.API.Profile('me').fields("id", "email-address")
                .result(data => {
                    //On success extract the data from the response
                    const liData = data.values[0];
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
                        //Get from Linkedin
                        Email: liData.emailAddress,
                        ProviderId: liData.id,
                        //Passed in by registration
                        Role: this.props.selectedRole,
                    };
                    axios.post('/api/thirdPartyLogin/linkedin', regModel)
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
                });
            }
        );
    }

    render() {
        //Changes the button text from sign in to sign up depending on if it's the registration or login page            
        let isLogin = this.props.selectedRole === null ? 'in' : 'up';
        return (
            <button type="button" className="btn btn-lg btn-block btn-login-li" onClick={this.handleLinkedInClick}>
                <i className="fa fa-linkedin" aria-hidden="true"></i> {'Sign ' + isLogin + ' with LinkedIn'}
            </button>
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
export default withRouter(connect(mapStateToProps, mapDispatchToProps)(LinkedInBtn));
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
        this.init(); 
    }

    init = () => {
        gapi.load('auth2', () => { 
            this.auth2 = gapi.auth2.init({
                client_id: ''/* Client Id */,
                cookiepolicy: 'single_host_origin',
            });
        this.attachSignin(document.getElementById(this.props.id));
        });
    }
 
    attachSignin = (element) => {
        var googleUser ={};
        this.auth2.attachClickHandler(element, {},
            (googleUser) => {
                this.onSignIn(googleUser);
            });
    }

    redirect = (user) => {
        for (let i = 0; i < user.roles.length; i++) {
            if (user.roles[i] == "Admin") {
                window.location.href = "";
            }
        }
        if (user.roles[user.roleslength-1] !== "Admin" )
            {
                this.props.router.push('/userdashboard');
            }
    }
    
    onSignIn =(googleUser) => {
        var profile = googleUser.getBasicProfile();
        var id_token = googleUser.getAuthResponse().id_token;
        var data = {
            tokenId: id_token
        };
        axios.post('/api/googleauth', data)
            .then(response => { 
                let currUserName = this.props.user;
                    if(currUserName === null) {
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
                axios.post('/api/thirdPartyLogin/google', regModel)
                    .then(resp => {
                        this.props.createUser(resp.data.item);
                        this.redirect(resp.data.item);
                    })
                    .catch(err => {
                        this.props.loginError(err);
                    });
            })
            .catch(error => {
                console.log(error.response)
            });
    }

    render(){
        let isLogin = this.props.selectedRole === null ? 'in' : 'up';
        return(
            <div>
                <button type="button" className="btn btn-lg btn-block btn-login-g" id={this.props.id}>
                    <i className="fa fa-google-plus" aria-hidden="true"></i> {'Sign ' + isLogin + ' with Google'}
                </button>
            </div>
        )
    }
}

function mapStateToProps(state){
    return { 
        user: state.user
    }
}

function mapDispatchToProps(dispatch){
    return bindActionCreators({ createUser}, dispatch)
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(GoogleBtn));
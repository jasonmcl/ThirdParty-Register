using log4net;
using Project.Models.Domain;
using Project.Models.Requests;
using Project.Models.Responses;
using Project.Models.ViewModels;
using Project.Services;
using Project.Services.Interfaces;
using System;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Http;

namespace Project.Web.Controllers
{
    [RoutePrefix("api/thirdPartyLogin"), AllowAnonymous]
    public class ThirdPartyLoginController : ApiController
    {
        //Creates the logger used to add any errors this controller creates to the database
        private static readonly ILog log = LogManager.GetLogger(typeof(ThirdPartyLoginController));
        //Service used to access database for third party login
        private IThirdPartyLoginService _service;
        //Service used to add roles to user after registration
        private IAssignRoleService _roleService;
        //Service used to get api keys from the database
        private IConfigSettingsService _configService;

        [Route("{provider}"), HttpPost]
        public async Task<HttpResponseMessage> RegisterThirdParty(string provider, ThirdPartyCompleteModel model)
        {
            string errorMsg = "provider";
            try
            {
                Provider type;
                //Checks the provider passed in through the api call and assigns the type and error message if linkedin, google, or facebook
                switch(provider)
                {
                    case "linkedin":
                        type = Provider.LinkedIn;
                        errorMsg = "LinkedIn";
                        break;
                    case "google":
                        type = Provider.Google;
                        errorMsg = "Google";
                        break;
                    case "facebook":
                        type = Provider.Facebook;
                        errorMsg = "Facebook";
                        break;
                    default: return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "No provider exists with this name");
                }

                //If Facebook login call the service to get information from facebook
                if(type == Provider.Facebook)
                {
                    FacebookUserAuth userInfo = await _service.GetFBUserInfo(model.AccessToken);
                    model.Email = userInfo.Email;
                    model.ProviderId = userInfo.Id;
                }

                //Checks if the email exists in the database
                int accountId = _service.CheckEmail(model.Email);
                //If the email doesn't exist we need to register a new account
                if(accountId == 0)
                {
                    //Pass the information and role into the register function, and get back the new account id
                    accountId = Register(model, model.Role);
                    //If something went wrong return an error
                    if(accountId == -1)
                    {
                        return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "Login Error");
                    }
                }

                SocialProviderUser spu = new SocialProviderUser();
                spu.Email = model.Email;
                spu.Id = accountId;
                spu.ProviderId = model.ProviderId;
                //Send the email, account id, and provider id to the login function
                if (_service.LogIn(spu, type))
                {
                    //If the login was successful, get the user information and send it back
                    ItemResponse<PersonViewModel> resp = new ItemResponse<PersonViewModel>();
                    resp.Item = _service.SelectPerson(spu.Id);
                    return Request.CreateResponse(HttpStatusCode.OK, resp);
                }
                else
                {
                    //If the login was unsuccessful, return an error
                    return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "Something went wrong logging in with " + errorMsg);
                }
            }
            catch(Exception ex)
            {
                //If an exception occurs log it and return an error
                log.Error("Error registering " + errorMsg + " account", ex);
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "Something went wrong");
            }
        }

        [Route("apikey/{provider}"), HttpGet]
        public HttpResponseMessage GetApiKey(string provider)
        {
            try
            {
                ItemResponse<string> resp = new ItemResponse<string>();
                //Get the api key from the database based on the provider sent in
                switch (provider)
                {
                    case "linkedin": resp.Item = _configService.GetConfigValueByName("linkedin:APIKey").ConfigValue;
                        break;
                    case "facebook": resp.Item = _configService.GetConfigValueByName("facebook:APPKey").ConfigValue;
                        break;
                    case "google": resp.Item = _configService.GetConfigValueByName("google:clientId").ConfigValue;
                        break;
                    default: return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "This provider could not be found");
                }
                return Request.CreateResponse(HttpStatusCode.OK, resp);
            }
            catch(Exception ex)
            {
                //If an exception occurs log it and return an error                
                log.Error("Error getting " + provider + " api key", ex);
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest, "Something went wrong");
            }
        }

        private int Register(RegisterAddModel model, int role)
        {
            //If the user didn't select a role, then they are logging in - return -1
            if (role == 0)
            {
                return -1;
            }

            //Create base account
            int accountId = _service.CreateBaseAccount(model);

            AssignRoles arModel = new AssignRoles();
            arModel.AccountId = accountId;
            //Assign the selected student or mentor role
            arModel.RoleId = role;
            _roleService.Insert(arModel);

            //Assign the blogger role
            arModel.RoleId = 3;
            _roleService.Insert(arModel);

            //Return the id of the new account
            return accountId;
        }

        public ThirdPartyLoginController(IThirdPartyLoginService Service, IAssignRoleService RoleService, IConfigSettingsService ConfigService)
        {
            _service = Service;
            _roleService = RoleService;
            _configService = ConfigService;
        }
    }
}

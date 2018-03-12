using log4net;
using Project.Data;
using Project.Models.Domain;
using Project.Models.Requests;
using Project.Models.ViewModels;
using Project.Services.Cryptography;
using Project.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

namespace Project.Services
{
    //Enum to easily check which provider to use
    public enum Provider
    {
        LinkedIn,
        Facebook,
        Google
    }

    public class ThirdPartyLoginService : BaseService, IThirdPartyLoginService
    {
        //Logger used to add any errors created to the database
        private static readonly ILog log = LogManager.GetLogger(typeof(ThirdPartyLoginService));
        //Service used to create the base account
        private IUserService _userService;
        //Service used to generate a random string for passworc
        private ICryptographyService _cryptoService;

        //Function - Takes a RegisterAddModel and creates a base account in the database
        // - returns the Id of the new account
        public int CreateBaseAccount(RegisterAddModel model)
        {
            //Generates a random string for the password
            model.Password = _cryptoService.GenerateRandomString(12);
            //Sets the email confirmed to true because their email is confirmed through the third party
            model.EmailConfirmed = true;
            model.ModifiedBy = model.Email;

            //Calls the InsertNewUser from the user service to create the base account
            int accountId = _userService.InsertNewUser(model);
            return accountId;
        }

        //Function takes an Email and returns a user Id > 0 if the email exists
        public int CheckEmail(string email)
        {
            UserBase uModel = new UserBase();
            uModel.Email = email;
            //Calls the userService GetByEmail with the passed in email and recieves the account id if the account exists
            // or 0 if the account does not exist
            uModel = _userService.GetByEmail(uModel);
            return uModel.Id;
        }

        //Function - Takes an Id and selects the user information with that Id
        public PersonViewModel SelectPerson(int id)
        {
            PersonViewModel model = new PersonViewModel();
            //Access the SQL database and select the user info with that Id
            DataProvider.ExecuteCmd(
                "Account_SelectInfoById",
                inputParamMapper: delegate (SqlParameterCollection paramCol)
                {
                    paramCol.AddWithValue("@Id", id);
                },
                singleRecordMapper: delegate (IDataReader reader, short set)
                {
                    switch (set)
                    {
                        //First Select Statement
                        case 0:
                            //Creates the model with information from the db
                            model = Mapper(reader);
                            break;
                        //Second Select Statement
                        case 1:
                            //Creates an empty list if the list doesn't exist
                            if (model.Roles == null)
                            {
                                model.Roles = new List<string>();
                            }
                            //Maps the roles of the user
                            model.Roles.Add(MapRoles(reader));
                            break;
                    }
                }
            );
            return model;
        }

        //Function - Takes a user model, and provider and logs the user in
        public bool LogIn(SocialProviderUser model, Provider type)
        {
            //Gets the provider Id from the table
            string tableProviderId = GetProviderId(model.Id, type);
            //If the provider Id does not match the one in the table return an error
            if (tableProviderId != null && tableProviderId != model.ProviderId)
            {
                log.Error("The provided Id: " + model.ProviderId + " does not match the one in the table: " + tableProviderId);
                return false;
            }

            //If the provider Id was not in the table - add it to the table
            if (tableProviderId == null)
            {
                SocialProviderAddRequest spModel = new SocialProviderAddRequest();
                spModel.Id = model.Id;
                spModel.ProviderId = model.ProviderId;
                //Adds the provider Id into the db with the account Id and the provider Id
                InsertProviderAccount(spModel, type);
            }

            //Calls the login function with the passed in model which creates the cookie for logging in
            _userService.LogInSocial(model);
            return true;
        }

        public void InsertProviderAccount(SocialProviderAddRequest model, Provider type)
        {
            string t = null;
            //Select the correct stored procedure based on the passed in provider type
            switch(type)
            {
                case Provider.LinkedIn: t = "LinkedIn";
                    break;
                case Provider.Facebook: t = "Facebook";
                    break;
                case Provider.Google: t = "Google";
                    break;
                default: return;
            }

            //Inserts the account id and the user id into the correct table
            DataProvider.ExecuteNonQuery(
                "Accounts_" + t + "_Insert",
                inputParamMapper: delegate(SqlParameterCollection paramCol)
                {
                    paramCol.AddWithValue("@Id", model.Id);
                    paramCol.AddWithValue("@ProviderId", model.ProviderId);
                }
            );
        }

        public string GetProviderId(int accountId, Provider type)
        {
            string t = null;
            //Select the correct stored procedure based on the passed in provider type
            switch (type)
            {
                case Provider.LinkedIn:
                    t = "LinkedIn";
                    break;
                case Provider.Facebook:
                    t = "Facebook";
                    break;
                case Provider.Google:
                    t = "Google";
                    break;
                default: return "";
            }

            //Selects the provider id from the correct table
            string providerId = null;
            DataProvider.ExecuteCmd(
                "Accounts_" + t + "_SelectProviderId",
                inputParamMapper: delegate (SqlParameterCollection paramCol)
                {
                    paramCol.AddWithValue("@Id", accountId);
                },
                singleRecordMapper: delegate (IDataReader reader, short set)
                {
                    providerId = reader.GetSafeString(0);
                }
            );
            return providerId;
        }

        //Function - takes an accessToken and gets user info from facebook
        public async Task<FacebookUserAuth> GetFBUserInfo(string accessToken)
        {
            //Creates the correct Url to access the facebook api
            string url = "https://graph.facebook.com/me?access_token=" + accessToken + "&fields=email";
            var httpClient = new HttpClient();

            HttpResponseMessage httpResponseMessage;
            FacebookUserAuth content = new FacebookUserAuth();
            try
            {
                //Calls the facebook api to get the user info
                httpResponseMessage = await httpClient.GetAsync(url);
                httpResponseMessage.EnsureSuccessStatusCode();

                //Converts the http response to a JSON string
                string strCont = await httpResponseMessage.Content.ReadAsStringAsync();

                //Converts the string into a C# object we can use
                JavaScriptSerializer js = new JavaScriptSerializer();
                content = js.Deserialize<FacebookUserAuth>(strCont);
            }
            catch (Exception ex)
            {
                log.Error("Error getting FaceBook user information", ex);
            }

            return content;
        }

        //Function - Takes a DataReader and returns an object with information from the SQL Database
        private PersonViewModel Mapper(IDataReader reader)
        {
            PersonViewModel model = new PersonViewModel();
            int index = 0;
            model.FirstName = reader.GetSafeString(index++);
            model.MiddleInitial = reader.GetSafeString(index++);
            model.LastName = reader.GetSafeString(index++);
            model.DOB = reader.GetSafeDateTime(index++);
            model.Email = reader.GetSafeString(index++);

            return model;
        }

        //Function - Takes a DataReader and returns a string with a role from the SQL Database
        private string MapRoles(IDataReader reader)
        {
            string role = reader.GetSafeString(0);
            return role;
        }

        public ThirdPartyLoginService(IUserService UserService, ICryptographyService CryptoService)
        {
            _userService = UserService;
            _cryptoService = CryptoService;
        }
    }
}

create proc [dbo].[Accounts_LinkedIn_SelectProviderId]
	@Id int -- used to select a specific provider id
as
/*
	declare @_id int = 31;

	exec Accounts_LinkedIn_SelectProviderId @_id
*/
begin
	--Selects the provider id from the table that has the passed in account id
	Select 
		ProviderId
	from 
		Accounts_LinkedIn
	where
		Id = @Id;

end
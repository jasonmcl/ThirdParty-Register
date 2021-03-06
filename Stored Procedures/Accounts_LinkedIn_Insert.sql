create proc [dbo].[Accounts_LinkedIn_Insert]
	--Id and provider id to insert into the table
	@Id int,
	@ProviderId nvarchar(64)
as
/*
	declare @_id int = 1,
			@_providerId nvarchar(64) = 'TestId';

	exec Accounts_LinkedIn_Insert @_id, @_providerId;
*/
begin
	--Inserts the Id and ProviderId into the table
	insert into Accounts_LinkedIn(
		Id,
		ProviderId
	) values (
		@Id,
		@ProviderId
	);
end
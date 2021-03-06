create proc Account_SelectInfoById
	@Id int -- Used to select a specific account info
as
/*
	declare @_id int = 1;
	exec Account_SelectInfoById @_id;
*/
begin
	--Selects the first name, middle initial, last name, and date of birth from the person table
	-- and selects the email from the account table
	select
		p.FirstName,
		p.MiddleInitial,
		p.LastName,
		p.DOB,
		a.Email
	from
		Person as p join Accounts as a
	on
		p.AccountId = a.Id
	where 
		p.AccountId = @Id;

	--Selects all the roles that the passed in id has
	select 
		r.Description 
	from 
		Account_Roles as ar join Roles as r
	on
		ar.RoleId = r.Id
	where
		AccountId = @Id;
end;
Accounts.config({
        forbidClientAccountCreation: true
    });
    
if (Meteor.isClient) {
    var change_password = Accounts.changePassword;
    Accounts.changePassword = function () {
            change_password.apply(Accounts, arguments);
            Meteor.call('updateAccountList');
        };
}

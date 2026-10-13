const ACCOUNTS_KEY = "savedAccounts";
const ACTIVE_ACCOUNT_KEY = "activeAccountId";

export const getSavedAccounts = () => {
    try {
        return JSON.parse(
            localStorage.getItem(ACCOUNTS_KEY)
        ) || [];
    } catch (error) {
        console.error(
            "GET SAVED ACCOUNTS ERROR:",
            error
        );
        return [];
    }
};

export const getActiveAccountId = () => {
    return localStorage.getItem(
        ACTIVE_ACCOUNT_KEY
    );
};

export const getActiveAccount = () => {
    const accounts = getSavedAccounts();
    const activeId = getActiveAccountId();

    return accounts.find(
        account =>
            account.accountId === activeId
    ) || null;
};

export const saveAccount = ({
    token,
    user,
}) => {

    console.log(
        "SAVE ACCOUNT USER:",
        user
    );

    const accounts =
        getSavedAccounts();

    /*
     * Try all common ID fields
     */
    const accountId =
        user?._id ||
        user?.id ||
        user?.userId ||
        user?.superAdminId ||
        user?.superAdmin?._id ||
        user?.superAdmin?.id;

    /*
     * If no ID exists, use email as
     * a temporary unique account identifier.
     */
    const finalAccountId =
        accountId ||
        user?.email ||
        user?.Email;

    if (!finalAccountId) {
        console.error(
            "USER OBJECT:",
            user
        );

        throw new Error(
            "Unable to identify account"
        );
    }

    const accountData = {
        accountId: String(
            finalAccountId
        ),
        token,
        user,
        savedAt:
            new Date().toISOString(),
    };

    const existingIndex =
        accounts.findIndex(
            account =>
                account.accountId ===
                String(finalAccountId)
        );

    if (existingIndex >= 0) {
        accounts[existingIndex] =
            accountData;
    } else {
        accounts.push(
            accountData
        );
    }

    localStorage.setItem(
        ACCOUNTS_KEY,
        JSON.stringify(accounts)
    );

    localStorage.setItem(
        ACTIVE_ACCOUNT_KEY,
        String(finalAccountId)
    );

    /*
     * Keep your existing application
     * authentication system working.
     */
    localStorage.setItem(
        "token",
        token
    );

    localStorage.setItem(
        "user",
        JSON.stringify(user)
    );

    /*
     * Tell AppRoutes that authentication
     * has changed.
     */
    window.dispatchEvent(
        new Event("accountSwitched")
    );

    return accountData;
};

export const switchAccount = (
    accountId
) => {

    const accounts =
        getSavedAccounts();

    const account =
        accounts.find(
            item =>
                item.accountId ===
                String(accountId)
        );

    if (!account) {
        throw new Error(
            "Account not found"
        );
    }

    localStorage.setItem(
        ACTIVE_ACCOUNT_KEY,
        account.accountId
    );

    localStorage.setItem(
        "token",
        account.token
    );

    localStorage.setItem(
        "user",
        JSON.stringify(
            account.user
        )
    );

    window.dispatchEvent(
        new Event("accountSwitched")
    );

    window.dispatchEvent(
        new Event("businessUpdated")
    );

    return account;
};

export const removeAccount = (
    accountId
) => {

    const accounts =
        getSavedAccounts();

    const updatedAccounts =
        accounts.filter(
            account =>
                account.accountId !==
                String(accountId)
        );

    localStorage.setItem(
        ACCOUNTS_KEY,
        JSON.stringify(
            updatedAccounts
        )
    );

    return updatedAccounts;
};

export const clearAllAccounts = () => {

    localStorage.removeItem(
        ACCOUNTS_KEY
    );

    localStorage.removeItem(
        ACTIVE_ACCOUNT_KEY
    );

    localStorage.removeItem(
        "token"
    );

    localStorage.removeItem(
        "user"
    );
};
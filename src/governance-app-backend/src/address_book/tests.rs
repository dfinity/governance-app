use super::*;

const TEST_ICP_ADDRESS: &str = "d4685b31b51450508aff0331584df7692a84467b680326f5c5f7d30ae711682f";
const TEST_ICRC1_ADDRESS: &str = "h4a5i-5vcfo-5rusv-fmb6m-vrkia-mjnkc-jpoow-h5mam-nthnm-ldqlr-bqe";
const TEST_ICRC1_ADDRESS_WITH_SUBACCOUNT: &str =
    "k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae-6cc627i.1";

fn test_principal() -> Principal {
    Principal::from_slice(&[1, 2, 3, 4, 5])
}

fn make_address_book(entries: Vec<(&str, AddressType)>) -> AddressBook {
    AddressBook {
        named_addresses: entries
            .into_iter()
            .map(|(name, address)| NamedAddress {
                name: name.to_string(),
                address,
            })
            .collect(),
    }
}

fn make_numbered_address_book(count: usize) -> AddressBook {
    AddressBook {
        named_addresses: (0..count)
            .map(|i| NamedAddress {
                name: format!("Name {i:02}"),
                address: AddressType::Icp(TEST_ICP_ADDRESS.to_string()),
            })
            .collect(),
    }
}

fn icp(addr: &str) -> AddressType {
    AddressType::Icp(addr.to_string())
}

fn icrc1(addr: &str) -> AddressType {
    AddressType::Icrc1(addr.to_string())
}

// --- Get empty ---

#[test]
fn get_returns_empty_for_new_user() {
    let caller = test_principal();
    assert_eq!(
        get_address_book(caller),
        GetAddressBookResponse::Ok(AddressBook::default())
    );
}

// --- Set and get ---

#[test]
fn set_and_get_icp_address() {
    let caller = test_principal();
    let book = make_address_book(vec![("Alice", icp(TEST_ICP_ADDRESS))]);

    assert_eq!(
        set_address_book(caller, book.clone()),
        SetAddressBookResponse::Ok
    );
    assert_eq!(get_address_book(caller), GetAddressBookResponse::Ok(book));
}

#[test]
fn set_and_get_icrc1_address() {
    let caller = test_principal();
    let book = make_address_book(vec![("Bob", icrc1(TEST_ICRC1_ADDRESS))]);

    assert_eq!(
        set_address_book(caller, book.clone()),
        SetAddressBookResponse::Ok
    );
    assert_eq!(get_address_book(caller), GetAddressBookResponse::Ok(book));
}

#[test]
fn set_and_get_icrc1_with_subaccount() {
    let caller = test_principal();
    let book = make_address_book(vec![("Carol", icrc1(TEST_ICRC1_ADDRESS_WITH_SUBACCOUNT))]);

    assert_eq!(
        set_address_book(caller, book.clone()),
        SetAddressBookResponse::Ok
    );
    assert_eq!(get_address_book(caller), GetAddressBookResponse::Ok(book));
}

#[test]
fn set_replaces_entire_address_book() {
    let caller = test_principal();

    let book1 = make_address_book(vec![("Alice", icp(TEST_ICP_ADDRESS))]);
    assert_eq!(
        set_address_book(caller, book1.clone()),
        SetAddressBookResponse::Ok
    );
    assert_eq!(get_address_book(caller), GetAddressBookResponse::Ok(book1));

    let book2 = make_address_book(vec![("Bob", icrc1(TEST_ICRC1_ADDRESS))]);
    assert_eq!(
        set_address_book(caller, book2.clone()),
        SetAddressBookResponse::Ok
    );
    assert_eq!(get_address_book(caller), GetAddressBookResponse::Ok(book2));

    let book3 = make_address_book(vec![
        ("Charlie", icp(TEST_ICP_ADDRESS)),
        ("Dave", icrc1(TEST_ICRC1_ADDRESS)),
        ("Eve", icrc1(TEST_ICRC1_ADDRESS_WITH_SUBACCOUNT)),
    ]);
    assert_eq!(
        set_address_book(caller, book3.clone()),
        SetAddressBookResponse::Ok
    );
    assert_eq!(get_address_book(caller), GetAddressBookResponse::Ok(book3));
}

#[test]
fn set_max_entries_ok() {
    let caller = test_principal();
    let book = make_numbered_address_book(20);
    assert_eq!(set_address_book(caller, book), SetAddressBookResponse::Ok);
}

// --- Validation: count ---

#[test]
fn rejects_too_many_entries() {
    let caller = test_principal();
    let book = make_numbered_address_book(21);
    assert_eq!(
        set_address_book(caller, book),
        SetAddressBookResponse::TooManyNamedAddresses { limit: 20 }
    );
}

// --- Validation: name length ---

#[test]
fn rejects_name_too_short() {
    let caller = test_principal();
    let book = make_address_book(vec![("AB", icp(TEST_ICP_ADDRESS))]);
    assert_eq!(
        set_address_book(caller, book),
        SetAddressBookResponse::AddressNameTooShort { min_length: 3 }
    );
}

#[test]
fn rejects_name_too_short_after_trimming() {
    let caller = test_principal();
    let book = make_address_book(vec![("  AB  ", icp(TEST_ICP_ADDRESS))]);
    assert_eq!(
        set_address_book(caller, book),
        SetAddressBookResponse::AddressNameTooShort { min_length: 3 }
    );
}

#[test]
fn rejects_name_too_long() {
    let caller = test_principal();
    let long_name = "A".repeat(65);
    let book = make_address_book(vec![(&long_name, icp(TEST_ICP_ADDRESS))]);
    assert_eq!(
        set_address_book(caller, book),
        SetAddressBookResponse::AddressNameTooLong { max_length: 64 }
    );
}

#[test]
fn accepts_name_at_max_length() {
    let caller = test_principal();
    let max_name = "A".repeat(64);
    let book = make_address_book(vec![(&max_name, icp(TEST_ICP_ADDRESS))]);
    assert_eq!(set_address_book(caller, book), SetAddressBookResponse::Ok);
}

// --- Validation: duplicate names ---

#[test]
fn rejects_duplicate_names() {
    let caller = test_principal();
    let book = make_address_book(vec![
        ("Alice", icp(TEST_ICP_ADDRESS)),
        ("Alice", icrc1(TEST_ICRC1_ADDRESS)),
    ]);
    assert_eq!(
        set_address_book(caller, book),
        SetAddressBookResponse::DuplicateAddressName {
            name: "Alice".to_string()
        }
    );
}

// --- Validation: ICP address ---

#[test]
fn rejects_invalid_icp_address_bad_hex() {
    let caller = test_principal();
    let book = make_address_book(vec![("Alice", icp("not-hex"))]);
    assert!(matches!(
        set_address_book(caller, book),
        SetAddressBookResponse::InvalidIcpAddress { .. }
    ));
}

#[test]
fn rejects_invalid_icp_address_bad_checksum() {
    let caller = test_principal();
    let book = make_address_book(vec![(
        "Alice",
        icp("0000000000000000000000000000000000000000000000000000000000000000"),
    )]);
    assert!(matches!(
        set_address_book(caller, book),
        SetAddressBookResponse::InvalidIcpAddress { .. }
    ));
}

// --- Validation: ICRC1 address ---

#[test]
fn rejects_invalid_icrc1_address() {
    let caller = test_principal();
    let book = make_address_book(vec![("Alice", icrc1("not-a-principal"))]);
    assert!(matches!(
        set_address_book(caller, book),
        SetAddressBookResponse::InvalidIcrc1Address { .. }
    ));
}

#[test]
fn rejects_invalid_icrc1_subaccount_leading_zeros() {
    let caller = test_principal();
    let book = make_address_book(vec![(
        "Alice",
        icrc1("k2t6j-2nvnp-4zjm3-25dtz-6xhaa-c7boj-5gayf-oj3xs-i43lp-teztq-6ae-6cc627i.000001"),
    )]);
    assert!(matches!(
        set_address_book(caller, book),
        SetAddressBookResponse::InvalidIcrc1Address { .. }
    ));
}

// --- Validation errors don't persist ---

#[test]
fn failed_set_does_not_modify_data() {
    let caller = test_principal();

    let good_book = make_address_book(vec![("Alice", icp(TEST_ICP_ADDRESS))]);
    assert_eq!(
        set_address_book(caller, good_book.clone()),
        SetAddressBookResponse::Ok
    );

    let bad_book = make_address_book(vec![("X", icp(TEST_ICP_ADDRESS))]);
    assert!(matches!(
        set_address_book(caller, bad_book),
        SetAddressBookResponse::AddressNameTooShort { .. }
    ));

    assert_eq!(
        get_address_book(caller),
        GetAddressBookResponse::Ok(good_book)
    );
}

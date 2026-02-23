use candid::{CandidType, Principal};
use ic_ledger_types::AccountIdentifier;
use icrc_ledger_types::icrc1::account::Account as Icrc1Account;
use serde::Deserialize;
use std::collections::HashSet;
use std::str::FromStr;

use crate::user_data;

const MAX_NAMED_ADDRESSES: i32 = 20;
const MIN_NAMED_ADDRESS_NAME_LENGTH: i32 = 3;
const MAX_NAMED_ADDRESS_NAME_LENGTH: i32 = 64;

// --- Types ---

#[derive(CandidType, Clone, Deserialize, Debug, Eq, PartialEq)]
pub enum AddressType {
    Icp(String),
    Icrc1(String),
}

#[derive(CandidType, Clone, Deserialize, Debug, Eq, PartialEq)]
pub struct NamedAddress {
    pub address: AddressType,
    pub name: String,
}

#[derive(CandidType, Clone, Default, Deserialize, Debug, Eq, PartialEq)]
pub struct AddressBook {
    pub named_addresses: Vec<NamedAddress>,
}

#[derive(CandidType, Debug, PartialEq)]
pub enum SetAddressBookResponse {
    Ok,
    TooManyNamedAddresses { limit: i32 },
    InvalidIcpAddress { error: String },
    AddressNameTooShort { min_length: i32 },
    AddressNameTooLong { max_length: i32 },
    InvalidIcrc1Address { error: String },
    DuplicateAddressName { name: String },
}

#[derive(CandidType, Debug, PartialEq)]
pub enum GetAddressBookResponse {
    Ok(AddressBook),
}

// --- Validation (same pipeline as nns-dapp) ---

fn normalize_name(name: &str) -> String {
    let trimmed = name.trim();
    let re = regex::Regex::new(r"\s+").unwrap();
    re.replace_all(trimmed, " ").to_string()
}

fn validate_count(address_book: &AddressBook) -> Result<(), SetAddressBookResponse> {
    if address_book.named_addresses.len() > (MAX_NAMED_ADDRESSES as usize) {
        return Err(SetAddressBookResponse::TooManyNamedAddresses {
            limit: MAX_NAMED_ADDRESSES,
        });
    }
    Ok(())
}

fn validate_unique_names(address_book: &AddressBook) -> Result<(), SetAddressBookResponse> {
    let mut seen_names = HashSet::new();
    for named_address in &address_book.named_addresses {
        if !seen_names.insert(&named_address.name) {
            return Err(SetAddressBookResponse::DuplicateAddressName {
                name: named_address.name.clone(),
            });
        }
    }
    Ok(())
}

fn validate_names_length(address_book: &AddressBook) -> Result<(), SetAddressBookResponse> {
    for named_address in &address_book.named_addresses {
        let normalized_name = normalize_name(&named_address.name);
        let name_len = normalized_name.len();

        if name_len < (MIN_NAMED_ADDRESS_NAME_LENGTH as usize) {
            return Err(SetAddressBookResponse::AddressNameTooShort {
                min_length: MIN_NAMED_ADDRESS_NAME_LENGTH,
            });
        }

        if name_len > (MAX_NAMED_ADDRESS_NAME_LENGTH as usize) {
            return Err(SetAddressBookResponse::AddressNameTooLong {
                max_length: MAX_NAMED_ADDRESS_NAME_LENGTH,
            });
        }
    }
    Ok(())
}

fn validate_addresses(address_book: &AddressBook) -> Result<(), SetAddressBookResponse> {
    for named_address in &address_book.named_addresses {
        match &named_address.address {
            AddressType::Icp(address_str) => {
                if let Err(e) = AccountIdentifier::from_hex(address_str) {
                    return Err(SetAddressBookResponse::InvalidIcpAddress {
                        error: format!("Invalid ICP address: {e}"),
                    });
                }
            }
            AddressType::Icrc1(address_str) => {
                if let Err(e) = Icrc1Account::from_str(address_str) {
                    return Err(SetAddressBookResponse::InvalidIcrc1Address {
                        error: format!("Invalid ICRC1 address: {e}"),
                    });
                }
            }
        }
    }
    Ok(())
}

fn validate_address_book(address_book: &AddressBook) -> Result<(), SetAddressBookResponse> {
    validate_count(address_book)?;
    validate_unique_names(address_book)?;
    validate_names_length(address_book)?;
    validate_addresses(address_book)?;
    Ok(())
}

// --- Public API ---

pub fn get_address_book(caller: Principal) -> GetAddressBookResponse {
    let user_data = user_data::get_user_data(&caller);
    GetAddressBookResponse::Ok(user_data.address_book)
}

pub fn set_address_book(
    caller: Principal,
    new_address_book: AddressBook,
) -> SetAddressBookResponse {
    if let Err(error_response) = validate_address_book(&new_address_book) {
        return error_response;
    }

    let mut user_data = user_data::get_user_data(&caller);
    user_data.address_book = new_address_book;
    user_data::set_user_data(caller, user_data);
    SetAddressBookResponse::Ok
}

#[cfg(test)]
mod tests;

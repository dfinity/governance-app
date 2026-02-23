use candid::{CandidType, Principal};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::Bound,
    DefaultMemoryImpl, StableBTreeMap, Storable,
};
use serde::Deserialize;
use std::borrow::Cow;
use std::cell::RefCell;

use crate::address_book::AddressBook;

const USER_DATA_MEMORY_ID: MemoryId = MemoryId::new(1);

type Memory = VirtualMemory<DefaultMemoryImpl>;

#[derive(CandidType, Clone, Default, Deserialize, Debug, Eq, PartialEq)]
pub struct UserData {
    pub address_book: AddressBook,
}

impl Storable for UserData {
    fn to_bytes(&self) -> Cow<'_, [u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode UserData"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::encode_one(&self).expect("Failed to encode UserData")
    }

    fn from_bytes(bytes: Cow<'_, [u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode UserData")
    }

    const BOUND: Bound = Bound::Unbounded;
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static USER_DATA_MAP: RefCell<StableBTreeMap<Principal, UserData, Memory>> =
        RefCell::new(
            MEMORY_MANAGER.with(|mm| {
                StableBTreeMap::init(mm.borrow().get(USER_DATA_MEMORY_ID))
            })
        );
}

pub fn get_user_data(caller: &Principal) -> UserData {
    USER_DATA_MAP.with(|map| map.borrow().get(caller).unwrap_or_default())
}

pub fn set_user_data(caller: Principal, user_data: UserData) {
    USER_DATA_MAP.with(|map| {
        map.borrow_mut().insert(caller, user_data);
    });
}

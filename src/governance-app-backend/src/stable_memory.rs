use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl,
};
use std::cell::RefCell;

/// Each stable structure has its own ID. Never reuse or change an ID, because the data stays
/// in stable memory across upgrades.
pub const USER_DATA_MEMORY_ID: MemoryId = MemoryId::new(0);
pub const ICP_TO_USD_MONTH_HISTORY_MEMORY_ID: MemoryId = MemoryId::new(1);

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
}

pub fn get_memory(memory_id: MemoryId) -> Memory {
    MEMORY_MANAGER.with(|manager| manager.borrow().get(memory_id))
}

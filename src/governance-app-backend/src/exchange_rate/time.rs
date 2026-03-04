#[cfg(not(test))]
pub fn time_nanos() -> u64 {
    ic_cdk::api::time()
}

#[cfg(test)]
pub use testing::time_nanos;

#[cfg(test)]
pub mod testing {
    use std::cell::RefCell;

    thread_local! {
        static TIME: RefCell<u64> = const { RefCell::new(0) };
    }

    pub fn time_nanos() -> u64 {
        TIME.with(|t| *t.borrow())
    }

    pub fn set_time_nanos(nanos: u64) {
        TIME.with(|t| *t.borrow_mut() = nanos);
    }
}

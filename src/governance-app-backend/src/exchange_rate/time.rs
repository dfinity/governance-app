#[cfg(not(test))]
pub fn time_seconds() -> u64 {
    const NANOS_PER_SEC: u64 = 1_000_000_000;
    ic_cdk::api::time() / NANOS_PER_SEC
}

#[cfg(test)]
pub use testing::time_seconds;

#[cfg(test)]
pub mod testing {
    use std::cell::RefCell;

    thread_local! {
        static TIME_SECONDS: RefCell<u64> = const { RefCell::new(0) };
    }

    pub fn time_seconds() -> u64 {
        TIME_SECONDS.with(|t| *t.borrow())
    }

    pub fn set_time_seconds(seconds: u64) {
        TIME_SECONDS.with(|t| *t.borrow_mut() = seconds);
    }
}

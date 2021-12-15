use std::sync::Arc;

use super::{EngineConfig, PersistenceConfig, StoreConfig};
use crate::{config::Globals, proto::SimulationShortId};

pub struct Config {
    pub id: SimulationShortId,
    pub globals: Arc<Globals>,
    pub store: Arc<StoreConfig>,
    pub engine: Arc<EngineConfig>,
    pub max_num_steps: usize,
    pub persistence: PersistenceConfig,
}
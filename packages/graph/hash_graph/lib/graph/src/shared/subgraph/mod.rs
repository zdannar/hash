use std::{collections::HashSet, fmt::Debug};

use edges::Edges;

use crate::{
    shared::identifier::GraphElementEditionId,
    subgraph::{edges::GraphResolveDepths, vertices::Vertices},
};

pub mod edges;
pub mod query;
pub mod vertices;

#[derive(Debug)]
pub struct Subgraph {
    pub roots: HashSet<GraphElementEditionId>,
    pub vertices: Vertices,
    pub edges: Edges,
    pub depths: GraphResolveDepths,
}

impl Subgraph {
    #[must_use]
    pub fn new(depths: GraphResolveDepths) -> Self {
        Self {
            roots: HashSet::new(),
            vertices: Vertices::default(),
            edges: Edges::default(),
            depths,
        }
    }
}

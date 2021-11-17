#![allow(
    clippy::module_name_repetitions,
    clippy::must_use_candidate,
    clippy::cast_sign_loss,
    clippy::empty_enum,
    clippy::used_underscore_binding,
    clippy::redundant_static_lifetimes,
    clippy::redundant_field_names,
    clippy::unused_imports,
    unused_imports
)]
// automatically generated by the FlatBuffers compiler, do not modify

use super::serialized_generated::*;
use std::cmp::Ordering;
use std::mem;

extern crate flatbuffers;
use self::flatbuffers::{EndianScalar, Follow};

#[deprecated(
    since = "2.0.0",
    note = "Use associated constants instead. This will no longer be generated in 2021."
)]
pub const ENUM_MIN_PACKAGE_TYPE: i8 = 0;
#[deprecated(
    since = "2.0.0",
    note = "Use associated constants instead. This will no longer be generated in 2021."
)]
pub const ENUM_MAX_PACKAGE_TYPE: i8 = 3;
#[deprecated(
    since = "2.0.0",
    note = "Use associated constants instead. This will no longer be generated in 2021."
)]
#[allow(non_camel_case_types)]
pub const ENUM_VALUES_PACKAGE_TYPE: [PackageType; 4] = [
    PackageType::Init,
    PackageType::Context,
    PackageType::State,
    PackageType::Output,
];

#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default)]
#[repr(transparent)]
pub struct PackageType(pub i8);
#[allow(non_upper_case_globals)]
impl PackageType {
    pub const Init: Self = Self(0);
    pub const Context: Self = Self(1);
    pub const State: Self = Self(2);
    pub const Output: Self = Self(3);

    pub const ENUM_MIN: i8 = 0;
    pub const ENUM_MAX: i8 = 3;
    pub const ENUM_VALUES: &'static [Self] =
        &[Self::Init, Self::Context, Self::State, Self::Output];
    /// Returns the variant's name or "" if unknown.
    pub fn variant_name(self) -> Option<&'static str> {
        match self {
            Self::Init => Some("Init"),
            Self::Context => Some("Context"),
            Self::State => Some("State"),
            Self::Output => Some("Output"),
            _ => None,
        }
    }
}
impl std::fmt::Debug for PackageType {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        if let Some(name) = self.variant_name() {
            f.write_str(name)
        } else {
            f.write_fmt(format_args!("<UNKNOWN {:?}>", self.0))
        }
    }
}
impl<'a> flatbuffers::Follow<'a> for PackageType {
    type Inner = Self;
    #[inline]
    fn follow(buf: &'a [u8], loc: usize) -> Self::Inner {
        let b = unsafe { flatbuffers::read_scalar_at::<i8>(buf, loc) };
        Self(b)
    }
}

impl flatbuffers::Push for PackageType {
    type Output = PackageType;
    #[inline]
    fn push(&self, dst: &mut [u8], _rest: &[u8]) {
        unsafe {
            flatbuffers::emplace_scalar::<i8>(dst, self.0);
        }
    }
}

impl flatbuffers::EndianScalar for PackageType {
    #[inline]
    fn to_little_endian(self) -> Self {
        let b = i8::to_le(self.0);
        Self(b)
    }
    #[inline]
    #[allow(clippy::wrong_self_convention)]
    fn from_little_endian(self) -> Self {
        let b = i8::from_le(self.0);
        Self(b)
    }
}

impl<'a> flatbuffers::Verifiable for PackageType {
    #[inline]
    fn run_verifier(
        v: &mut flatbuffers::Verifier,
        pos: usize,
    ) -> Result<(), flatbuffers::InvalidFlatbuffer> {
        use self::flatbuffers::Verifiable;
        i8::run_verifier(v, pos)
    }
}

impl flatbuffers::SimpleToVerifyInSlice for PackageType {}
pub enum PackageOffset {}
#[derive(Copy, Clone, PartialEq)]

pub struct Package<'a> {
    pub _tab: flatbuffers::Table<'a>,
}

impl<'a> flatbuffers::Follow<'a> for Package<'a> {
    type Inner = Package<'a>;
    #[inline]
    fn follow(buf: &'a [u8], loc: usize) -> Self::Inner {
        Self {
            _tab: flatbuffers::Table { buf, loc },
        }
    }
}

impl<'a> Package<'a> {
    #[inline]
    pub fn init_from_table(table: flatbuffers::Table<'a>) -> Self {
        Package { _tab: table }
    }
    #[allow(unused_mut)]
    pub fn create<'bldr: 'args, 'args: 'mut_bldr, 'mut_bldr>(
        _fbb: &'mut_bldr mut flatbuffers::FlatBufferBuilder<'bldr>,
        args: &'args PackageArgs<'args>,
    ) -> flatbuffers::WIPOffset<Package<'bldr>> {
        let mut builder = PackageBuilder::new(_fbb);
        builder.add_sid(args.sid);
        if let Some(x) = args.init_payload {
            builder.add_init_payload(x);
        }
        if let Some(x) = args.name {
            builder.add_name(x);
        }
        builder.add_type_(args.type_);
        builder.finish()
    }

    pub const VT_TYPE_: flatbuffers::VOffsetT = 4;
    pub const VT_NAME: flatbuffers::VOffsetT = 6;
    pub const VT_SID: flatbuffers::VOffsetT = 8;
    pub const VT_INIT_PAYLOAD: flatbuffers::VOffsetT = 10;

    #[inline]
    pub fn type_(&self) -> PackageType {
        self._tab
            .get::<PackageType>(Package::VT_TYPE_, Some(PackageType::Init))
            .unwrap()
    }
    #[inline]
    pub fn name(&self) -> &'a str {
        self._tab
            .get::<flatbuffers::ForwardsUOffset<&str>>(Package::VT_NAME, None)
            .unwrap()
    }
    #[inline]
    pub fn sid(&self) -> u64 {
        self._tab.get::<u64>(Package::VT_SID, Some(0)).unwrap()
    }
    #[inline]
    pub fn init_payload(&self) -> Option<Serialized<'a>> {
        self._tab
            .get::<flatbuffers::ForwardsUOffset<Serialized>>(Package::VT_INIT_PAYLOAD, None)
    }
}

impl flatbuffers::Verifiable for Package<'_> {
    #[inline]
    fn run_verifier(
        v: &mut flatbuffers::Verifier,
        pos: usize,
    ) -> Result<(), flatbuffers::InvalidFlatbuffer> {
        use self::flatbuffers::Verifiable;
        v.visit_table(pos)?
            .visit_field::<PackageType>(&"type_", Self::VT_TYPE_, false)?
            .visit_field::<flatbuffers::ForwardsUOffset<&str>>(&"name", Self::VT_NAME, true)?
            .visit_field::<u64>(&"sid", Self::VT_SID, false)?
            .visit_field::<flatbuffers::ForwardsUOffset<Serialized>>(
                &"init_payload",
                Self::VT_INIT_PAYLOAD,
                false,
            )?
            .finish();
        Ok(())
    }
}
pub struct PackageArgs<'a> {
    pub type_: PackageType,
    pub name: Option<flatbuffers::WIPOffset<&'a str>>,
    pub sid: u64,
    pub init_payload: Option<flatbuffers::WIPOffset<Serialized<'a>>>,
}
impl<'a> Default for PackageArgs<'a> {
    #[inline]
    fn default() -> Self {
        PackageArgs {
            type_: PackageType::Init,
            name: None, // required field
            sid: 0,
            init_payload: None,
        }
    }
}
pub struct PackageBuilder<'a: 'b, 'b> {
    fbb_: &'b mut flatbuffers::FlatBufferBuilder<'a>,
    start_: flatbuffers::WIPOffset<flatbuffers::TableUnfinishedWIPOffset>,
}
impl<'a: 'b, 'b> PackageBuilder<'a, 'b> {
    #[inline]
    pub fn add_type_(&mut self, type_: PackageType) {
        self.fbb_
            .push_slot::<PackageType>(Package::VT_TYPE_, type_, PackageType::Init);
    }
    #[inline]
    pub fn add_name(&mut self, name: flatbuffers::WIPOffset<&'b str>) {
        self.fbb_
            .push_slot_always::<flatbuffers::WIPOffset<_>>(Package::VT_NAME, name);
    }
    #[inline]
    pub fn add_sid(&mut self, sid: u64) {
        self.fbb_.push_slot::<u64>(Package::VT_SID, sid, 0);
    }
    #[inline]
    pub fn add_init_payload(&mut self, init_payload: flatbuffers::WIPOffset<Serialized<'b>>) {
        self.fbb_
            .push_slot_always::<flatbuffers::WIPOffset<Serialized>>(
                Package::VT_INIT_PAYLOAD,
                init_payload,
            );
    }
    #[inline]
    pub fn new(_fbb: &'b mut flatbuffers::FlatBufferBuilder<'a>) -> PackageBuilder<'a, 'b> {
        let start = _fbb.start_table();
        PackageBuilder {
            fbb_: _fbb,
            start_: start,
        }
    }
    #[inline]
    pub fn finish(self) -> flatbuffers::WIPOffset<Package<'a>> {
        let o = self.fbb_.end_table(self.start_);
        self.fbb_.required(o, Package::VT_NAME, "name");
        flatbuffers::WIPOffset::new(o.value())
    }
}

impl std::fmt::Debug for Package<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut ds = f.debug_struct("Package");
        ds.field("type_", &self.type_());
        ds.field("name", &self.name());
        ds.field("sid", &self.sid());
        ds.field("init_payload", &self.init_payload());
        ds.finish()
    }
}
pub enum PackageConfigOffset {}
#[derive(Copy, Clone, PartialEq)]

pub struct PackageConfig<'a> {
    pub _tab: flatbuffers::Table<'a>,
}

impl<'a> flatbuffers::Follow<'a> for PackageConfig<'a> {
    type Inner = PackageConfig<'a>;
    #[inline]
    fn follow(buf: &'a [u8], loc: usize) -> Self::Inner {
        Self {
            _tab: flatbuffers::Table { buf, loc },
        }
    }
}

impl<'a> PackageConfig<'a> {
    #[inline]
    pub fn init_from_table(table: flatbuffers::Table<'a>) -> Self {
        PackageConfig { _tab: table }
    }
    #[allow(unused_mut)]
    pub fn create<'bldr: 'args, 'args: 'mut_bldr, 'mut_bldr>(
        _fbb: &'mut_bldr mut flatbuffers::FlatBufferBuilder<'bldr>,
        args: &'args PackageConfigArgs<'args>,
    ) -> flatbuffers::WIPOffset<PackageConfig<'bldr>> {
        let mut builder = PackageConfigBuilder::new(_fbb);
        if let Some(x) = args.packages {
            builder.add_packages(x);
        }
        builder.finish()
    }

    pub const VT_PACKAGES: flatbuffers::VOffsetT = 4;

    #[inline]
    pub fn packages(&self) -> flatbuffers::Vector<'a, flatbuffers::ForwardsUOffset<Package<'a>>> {
        self._tab
            .get::<flatbuffers::ForwardsUOffset<
                flatbuffers::Vector<'a, flatbuffers::ForwardsUOffset<Package>>,
            >>(PackageConfig::VT_PACKAGES, None)
            .unwrap()
    }
}

impl flatbuffers::Verifiable for PackageConfig<'_> {
    #[inline]
    fn run_verifier(
        v: &mut flatbuffers::Verifier,
        pos: usize,
    ) -> Result<(), flatbuffers::InvalidFlatbuffer> {
        use self::flatbuffers::Verifiable;
        v.visit_table(pos)?
            .visit_field::<flatbuffers::ForwardsUOffset<
                flatbuffers::Vector<'_, flatbuffers::ForwardsUOffset<Package>>,
            >>(&"packages", Self::VT_PACKAGES, true)?
            .finish();
        Ok(())
    }
}
pub struct PackageConfigArgs<'a> {
    pub packages: Option<
        flatbuffers::WIPOffset<flatbuffers::Vector<'a, flatbuffers::ForwardsUOffset<Package<'a>>>>,
    >,
}
impl<'a> Default for PackageConfigArgs<'a> {
    #[inline]
    fn default() -> Self {
        PackageConfigArgs {
            packages: None, // required field
        }
    }
}
pub struct PackageConfigBuilder<'a: 'b, 'b> {
    fbb_: &'b mut flatbuffers::FlatBufferBuilder<'a>,
    start_: flatbuffers::WIPOffset<flatbuffers::TableUnfinishedWIPOffset>,
}
impl<'a: 'b, 'b> PackageConfigBuilder<'a, 'b> {
    #[inline]
    pub fn add_packages(
        &mut self,
        packages: flatbuffers::WIPOffset<
            flatbuffers::Vector<'b, flatbuffers::ForwardsUOffset<Package<'b>>>,
        >,
    ) {
        self.fbb_
            .push_slot_always::<flatbuffers::WIPOffset<_>>(PackageConfig::VT_PACKAGES, packages);
    }
    #[inline]
    pub fn new(_fbb: &'b mut flatbuffers::FlatBufferBuilder<'a>) -> PackageConfigBuilder<'a, 'b> {
        let start = _fbb.start_table();
        PackageConfigBuilder {
            fbb_: _fbb,
            start_: start,
        }
    }
    #[inline]
    pub fn finish(self) -> flatbuffers::WIPOffset<PackageConfig<'a>> {
        let o = self.fbb_.end_table(self.start_);
        self.fbb_
            .required(o, PackageConfig::VT_PACKAGES, "packages");
        flatbuffers::WIPOffset::new(o.value())
    }
}

impl std::fmt::Debug for PackageConfig<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let mut ds = f.debug_struct("PackageConfig");
        ds.field("packages", &self.packages());
        ds.finish()
    }
}
#[inline]
#[deprecated(since = "2.0.0", note = "Deprecated in favor of `root_as...` methods.")]
pub fn get_root_as_package_config<'a>(buf: &'a [u8]) -> PackageConfig<'a> {
    unsafe { flatbuffers::root_unchecked::<PackageConfig<'a>>(buf) }
}

#[inline]
#[deprecated(since = "2.0.0", note = "Deprecated in favor of `root_as...` methods.")]
pub fn get_size_prefixed_root_as_package_config<'a>(buf: &'a [u8]) -> PackageConfig<'a> {
    unsafe { flatbuffers::size_prefixed_root_unchecked::<PackageConfig<'a>>(buf) }
}

#[inline]
/// Verifies that a buffer of bytes contains a `PackageConfig`
/// and returns it.
/// Note that verification is still experimental and may not
/// catch every error, or be maximally performant. For the
/// previous, unchecked, behavior use
/// `root_as_package_config_unchecked`.
pub fn root_as_package_config(buf: &[u8]) -> Result<PackageConfig, flatbuffers::InvalidFlatbuffer> {
    flatbuffers::root::<PackageConfig>(buf)
}
#[inline]
/// Verifies that a buffer of bytes contains a size prefixed
/// `PackageConfig` and returns it.
/// Note that verification is still experimental and may not
/// catch every error, or be maximally performant. For the
/// previous, unchecked, behavior use
/// `size_prefixed_root_as_package_config_unchecked`.
pub fn size_prefixed_root_as_package_config(
    buf: &[u8],
) -> Result<PackageConfig, flatbuffers::InvalidFlatbuffer> {
    flatbuffers::size_prefixed_root::<PackageConfig>(buf)
}
#[inline]
/// Verifies, with the given options, that a buffer of bytes
/// contains a `PackageConfig` and returns it.
/// Note that verification is still experimental and may not
/// catch every error, or be maximally performant. For the
/// previous, unchecked, behavior use
/// `root_as_package_config_unchecked`.
pub fn root_as_package_config_with_opts<'b, 'o>(
    opts: &'o flatbuffers::VerifierOptions,
    buf: &'b [u8],
) -> Result<PackageConfig<'b>, flatbuffers::InvalidFlatbuffer> {
    flatbuffers::root_with_opts::<PackageConfig<'b>>(opts, buf)
}
#[inline]
/// Verifies, with the given verifier options, that a buffer of
/// bytes contains a size prefixed `PackageConfig` and returns
/// it. Note that verification is still experimental and may not
/// catch every error, or be maximally performant. For the
/// previous, unchecked, behavior use
/// `root_as_package_config_unchecked`.
pub fn size_prefixed_root_as_package_config_with_opts<'b, 'o>(
    opts: &'o flatbuffers::VerifierOptions,
    buf: &'b [u8],
) -> Result<PackageConfig<'b>, flatbuffers::InvalidFlatbuffer> {
    flatbuffers::size_prefixed_root_with_opts::<PackageConfig<'b>>(opts, buf)
}
#[inline]
/// Assumes, without verification, that a buffer of bytes contains a PackageConfig and returns it.
/// # Safety
/// Callers must trust the given bytes do indeed contain a valid `PackageConfig`.
pub unsafe fn root_as_package_config_unchecked(buf: &[u8]) -> PackageConfig {
    flatbuffers::root_unchecked::<PackageConfig>(buf)
}
#[inline]
/// Assumes, without verification, that a buffer of bytes contains a size prefixed PackageConfig and returns it.
/// # Safety
/// Callers must trust the given bytes do indeed contain a valid size prefixed `PackageConfig`.
pub unsafe fn size_prefixed_root_as_package_config_unchecked(buf: &[u8]) -> PackageConfig {
    flatbuffers::size_prefixed_root_unchecked::<PackageConfig>(buf)
}
#[inline]
pub fn finish_package_config_buffer<'a, 'b>(
    fbb: &'b mut flatbuffers::FlatBufferBuilder<'a>,
    root: flatbuffers::WIPOffset<PackageConfig<'a>>,
) {
    fbb.finish(root, None);
}

#[inline]
pub fn finish_size_prefixed_package_config_buffer<'a, 'b>(
    fbb: &'b mut flatbuffers::FlatBufferBuilder<'a>,
    root: flatbuffers::WIPOffset<PackageConfig<'a>>,
) {
    fbb.finish_size_prefixed(root, None);
}

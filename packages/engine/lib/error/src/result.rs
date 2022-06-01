use crate::{Context, Message, Report};

/// [`Result`](std::result::Result)`<T, `[`Report<C>`](Report)`>`
///
/// A reasonable return type to use throughout an application.
///
/// The `Result` type can be used with one or two parameters, where the first parameter represents
/// the [`Ok`] arm and the second parameter `Context` is used as in [`Report<C>`].
///
/// # Examples
///
/// `Result` can also be used in `fn main()`:
///
/// ```
/// # fn has_permission(_: usize, _: usize) -> bool { true }
/// # fn get_user() -> Result<usize, AccessError> { Ok(0) }
/// # fn get_resource() -> Result<usize, AccessError> { Ok(0) }
/// # #[derive(Debug)] enum AccessError { PermissionDenied(usize, usize) }
/// # impl core::fmt::Display for AccessError {
/// #    fn fmt(&self, _: &mut std::fmt::Formatter<'_>) -> std::fmt::Result { Ok(()) }
/// # }
/// # impl provider::Provider for AccessError { fn provide<'a>(&'a self, _: &mut provider::Demand<'a>) {} }
/// use error::{ensure, Result};
///
/// fn main() -> Result<(), AccessError> {
///     let user = get_user()?;
///     let resource = get_resource()?;
///
///     ensure!(
///         has_permission(user, resource),
///         AccessError::PermissionDenied(user, resource)
///     );
///
///     # const _: &str = stringify! {
///     ...
///     # }; Ok(())
/// }
/// ```
pub type Result<T, C> = core::result::Result<T, Report<C>>;

/// Extension trait for [`Result`][core::result::Result] to provide context information on
/// [`Report`]s.
pub trait ResultExt {
    /// Type of the [`Ok`] value in the [`Result`]
    type Ok;

    /// Type of the resulting context `C` inside of [`Report<C>`] when not providing a context.
    type Context;

    /// Adds new contextual message to the [`Frame`] stack of a [`Report`].
    ///
    /// [`Frame`]: crate::Frame
    ///
    /// # Example
    ///
    /// ```
    /// # use error::Result;
    /// # fn load_resource(_: &User, _: &Resource) -> Result<(), ()> { Ok(()) }
    /// # struct User;
    /// # struct Resource;
    /// use error::ResultExt;
    ///
    /// # let user = User;
    /// # let resource = Resource;
    /// # #[allow(unused_variables)]
    /// let resource = load_resource(&user, &resource).wrap_err("Could not load resource")?;
    /// # Result::Ok(())
    /// ```
    fn wrap_err<M>(self, message: M) -> Result<Self::Ok, Self::Context>
    where
        M: Message;

    /// Lazily adds new contextual message to the [`Frame`] stack of a [`Report`].
    ///
    /// The function is only executed in the `Err` arm.
    ///
    /// [`Frame`]: crate::Frame
    ///
    /// # Example
    ///
    /// ```
    /// # use core::fmt;
    /// # use error::Result;
    /// # fn load_resource(_: &User, _: &Resource) -> Result<(), ()> { Ok(()) }
    /// # struct User;
    /// # struct Resource;
    /// # impl fmt::Display for Resource { fn fmt(&self, _: &mut fmt::Formatter<'_>) -> fmt::Result { Ok(()) }}
    /// use error::ResultExt;
    ///
    /// # let user = User;
    /// # let resource = Resource;
    /// # #[allow(unused_variables)]
    /// let resource = load_resource(&user, &resource)
    ///     .wrap_err_lazy(|| format!("Could not load resource {resource}"))?;
    /// # Result::Ok(())
    /// ```
    fn wrap_err_lazy<M, F>(self, op: F) -> Result<Self::Ok, Self::Context>
    where
        M: Message,
        F: FnOnce() -> M;

    /// Adds a context provider to the [`Frame`] stack of a [`Report`] returning [`Result<T, C>`].
    ///
    /// [`Frame`]: crate::Frame
    // TODO: come up with a decent example
    fn provide_context<C>(self, context: C) -> Result<Self::Ok, C>
    where
        C: Context;

    /// Lazily adds a context provider to the [`Frame`] stack of a [`Report`] returning
    /// [`Result<T, C>`].
    ///
    /// The function is only executed in the `Err` arm.
    ///
    /// [`Frame`]: crate::Frame
    // TODO: come up with a decent example
    fn provide_context_lazy<C, F>(self, op: F) -> Result<Self::Ok, C>
    where
        C: Context,
        F: FnOnce() -> C;

    // TODO: Temporary, remove before releasing
    //   Currently only used to be backward compatible with hEngine. After binaries and orchestrator
    //   are adjusted, this can safely be removed.
    #[doc(hidden)]
    fn generalize(self) -> Result<Self::Ok, ()>;
}

impl<T, C> ResultExt for Result<T, C> {
    type Context = C;
    type Ok = T;

    #[track_caller]
    fn wrap_err<M>(self, message: M) -> Self
    where
        M: Message,
    {
        // Can't use `map_err` as `#[track_caller]` is unstable on closures
        match self {
            Ok(ok) => Ok(ok),
            Err(report) => Err(report.wrap(message)),
        }
    }

    #[track_caller]
    fn wrap_err_lazy<M, F>(self, message: F) -> Self
    where
        M: Message,
        F: FnOnce() -> M,
    {
        // Can't use `map_err` as `#[track_caller]` is unstable on closures
        match self {
            Ok(ok) => Ok(ok),
            Err(report) => Err(report.wrap(message())),
        }
    }

    #[track_caller]
    fn provide_context<C2>(self, context: C2) -> Result<T, C2>
    where
        C2: Context,
    {
        // Can't use `map_err` as `#[track_caller]` is unstable on closures
        match self {
            Ok(ok) => Ok(ok),
            Err(report) => Err(report.provide_context(context)),
        }
    }

    #[track_caller]
    fn provide_context_lazy<C2, F>(self, context: F) -> Result<T, C2>
    where
        C2: Context,
        F: FnOnce() -> C2,
    {
        // Can't use `map_err` as `#[track_caller]` is unstable on closures
        match self {
            Ok(ok) => Ok(ok),
            Err(report) => Err(report.provide_context(context())),
        }
    }

    fn generalize(self) -> Result<T, ()> {
        self.map_err(Report::generalize)
    }
}

/// Extends [`Result`] to convert the [`Err`] variant to a [`Report`]
pub trait IntoReport: Sized {
    /// Type of the [`Ok`] value in the [`Result`]
    type Ok;

    /// Type of the resulting [`Err`] variant wrapped inside a [`Report<E>`].
    type Err;

    /// Converts the [`Err`] variant of the [`Result`] to a [`Report`]
    fn report(self) -> Result<Self::Ok, Self::Err>;
}

impl<T, E> IntoReport for core::result::Result<T, E>
where
    Report<E>: From<E>,
{
    type Err = E;
    type Ok = T;

    #[track_caller]
    fn report(self) -> Result<T, E> {
        match self {
            Ok(value) => Ok(value),
            Err(error) => Err(Report::from(error)),
        }
    }
}

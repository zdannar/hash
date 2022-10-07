import { FunctionComponent } from "react";
import { Box, BoxProps } from "@mui/material";

interface AvatarProps extends BoxProps {
  title?: string;
  size?: number;
  src?: string;
}

export const Avatar: FunctionComponent<AvatarProps> = ({
  title,
  size = 20,
  src,
  ...props
}) => {
  const { sx = [], ...otherProps } = props;
  return (
    <Box
      sx={[
        ({ palette }) => ({
          width: size,
          height: size,
          display: "flex",
          ...(!src && {
            alignItems: "center",
            justifyContent: "center",
          }),
          borderRadius: "50%",
          backgroundColor: palette.blue[70],
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...otherProps}
    >
      {src ? (
        <Box
          component="img"
          src={src}
          sx={{
            height: "100%",
            width: "100%",
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      ) : (
        <Box
          component="span"
          sx={{
            color: ({ palette }) => palette.common.white,
            fontSize: size / 2,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- @todo what to do about empty title */}
          {(title || "User").charAt(0).toUpperCase()}
        </Box>
      )}
    </Box>
  );
};

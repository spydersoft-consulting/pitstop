import { FileTrigger } from "react-aria-components";
import { Button, type ButtonProps } from "./Button";

interface FileButtonProps extends Omit<ButtonProps, "onClick" | "onChange"> {
  accept?: string[];
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}

export const FileButton: React.FC<FileButtonProps> = ({ accept, multiple, onFiles, ...buttonProps }) => (
  <FileTrigger
    acceptedFileTypes={accept}
    allowsMultiple={multiple}
    onSelect={(files) => {
      if (files && files.length > 0) onFiles(Array.from(files));
    }}
  >
    <Button {...buttonProps} />
  </FileTrigger>
);

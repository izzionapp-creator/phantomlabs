import { useRefreshObjectMetadataItems } from '@/object-metadata/hooks/useRefreshObjectMetadataItems';
import { type ObjectMetadataItem } from '@/object-metadata/types/ObjectMetadataItem';
import {
  SettingsObjectFieldItemTableRow,
  StyledObjectFieldTableRow,
} from '@/settings/data-model/object-details/components/SettingsObjectFieldItemTableRow';
import { settingsObjectFieldsFamilyState } from '@/settings/data-model/object-details/states/settingsObjectFieldsFamilyState';
import { SettingsTextInput } from '@/ui/input/components/SettingsTextInput';
import { DraggableItem } from '@/ui/layout/draggable-list/components/DraggableItem';
import { DraggableList } from '@/ui/layout/draggable-list/components/DraggableList';
import { Dropdown } from '@/ui/layout/dropdown/components/Dropdown';
import { DropdownContent } from '@/ui/layout/dropdown/components/DropdownContent';
import { DropdownMenuItemsContainer } from '@/ui/layout/dropdown/components/DropdownMenuItemsContainer';
import { SortableTableHeader } from '@/ui/layout/table/components/SortableTableHeader';
import { Table } from '@/ui/layout/table/components/Table';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { useSortedArray } from '@/ui/layout/table/hooks/useSortedArray';
import { type TableMetadata } from '@/ui/layout/table/types/TableMetadata';
import { useRefreshCoreViewsByObjectMetadataId } from '@/views/hooks/useRefreshCoreViewsByObjectMetadataId';
import styled from '@emotion/styled';
import { type DropResult } from '@hello-pangea/dnd';
import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react/macro';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRecoilState } from 'recoil';
import { isDefined } from 'twenty-shared/utils';
import { IconArchive, IconFilter, IconSearch } from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { MenuItemToggle } from 'twenty-ui/navigation';
import { useUpdateOneFieldMetadataItemMutation } from '~/generated-metadata/graphql';
import { useMapFieldMetadataItemToSettingsObjectDetailTableItem } from '~/pages/settings/data-model/hooks/useMapFieldMetadataItemToSettingsObjectDetailTableItem';
import { type SettingsObjectDetailTableItem } from '~/pages/settings/data-model/types/SettingsObjectDetailTableItem';
import { moveArrayItem } from '~/utils/array/moveArrayItem';
import { normalizeSearchText } from '~/utils/normalizeSearchText';


const GET_SETTINGS_OBJECT_DETAIL_TABLE_METADATA_STANDARD: TableMetadata<SettingsObjectDetailTableItem> =
  {
    tableId: 'settingsObjectDetail',
    fields: [
      {
        fieldLabel: msg`Name`,
        fieldName: 'label',
        fieldType: 'string',
        align: 'left',
      },
      {
        fieldLabel: msg`Field type`,
        fieldName: 'fieldType',
        fieldType: 'string',
        align: 'left',
      },
      {
        fieldLabel: msg`Data type`,
        fieldName: 'dataType',
        fieldType: 'string',
        align: 'left',
      },
    ],
    initialSort: {
      fieldName: 'position',
      orderBy: 'AscNullsLast',
    },
  };

const GET_SETTINGS_OBJECT_DETAIL_TABLE_METADATA_CUSTOM: TableMetadata<SettingsObjectDetailTableItem> =
  {
    tableId: 'settingsObjectDetail',
    fields: [
      {
        fieldLabel: msg`Name`,
        fieldName: 'label',
        fieldType: 'string',
        align: 'left',
      },
      {
        fieldLabel: msg`Identifier`,
        fieldName: 'identifierType',
        fieldType: 'string',
        align: 'left',
      },
      {
        fieldLabel: msg`Data type`,
        fieldName: 'dataType',
        fieldType: 'string',
        align: 'left',
      },
    ],
    initialSort: {
      fieldName: 'position',
      orderBy: 'AscNullsLast',
    },
  };

const StyledSearchAndFilterContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing(2)};
  padding-bottom: ${({ theme }) => theme.spacing(2)};
  width: 100%;
`;

const StyledSearchInput = styled(SettingsTextInput)`
  flex: 1;
`;

export type SettingsObjectFieldTableProps = {
  objectMetadataItem: ObjectMetadataItem;
  mode: 'view' | 'new-field';
};

// TODO: find another way than using mode which feels like it could be replaced by another pattern
export const SettingsObjectFieldTable = ({
  objectMetadataItem,
  mode,
}: SettingsObjectFieldTableProps) => {
  const { t } = useLingui();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(true);

  const tableMetadata = objectMetadataItem.isCustom
    ? GET_SETTINGS_OBJECT_DETAIL_TABLE_METADATA_CUSTOM
    : GET_SETTINGS_OBJECT_DETAIL_TABLE_METADATA_STANDARD;

  const { mapFieldMetadataItemToSettingsObjectDetailTableItem } =
    useMapFieldMetadataItemToSettingsObjectDetailTableItem(objectMetadataItem);

  const [settingsObjectFields, setSettingsObjectFields] = useRecoilState(
    settingsObjectFieldsFamilyState({
      objectMetadataItemId: objectMetadataItem.id,
    }),
  );


  useEffect(() => {
    setSettingsObjectFields(objectMetadataItem.fields);
  }, [objectMetadataItem, setSettingsObjectFields]);

  const allObjectSettingsDetailItems = useMemo(() => {
    const nonSystemFields = settingsObjectFields?.filter(
      (fieldMetadataItem) => !fieldMetadataItem.isSystem,
    );

    return (
      nonSystemFields?.map(
        mapFieldMetadataItemToSettingsObjectDetailTableItem,
      ) ?? []
    );
  }, [
    settingsObjectFields,
    mapFieldMetadataItemToSettingsObjectDetailTableItem,
  ]);

  const sortedAllObjectSettingsDetailItems = useSortedArray(
    allObjectSettingsDetailItems,
    tableMetadata,
  );

  const filteredItems = useMemo(() => {
    const searchNormalized = normalizeSearchText(searchTerm);

    return sortedAllObjectSettingsDetailItems.filter((item) => {
      const matchesActiveFilter =
        showInactive || item.fieldMetadataItem.isActive;

      const matchesSearch =
        normalizeSearchText(item.label).includes(searchNormalized) ||
        normalizeSearchText(item.dataType).includes(searchNormalized);

      return matchesActiveFilter && matchesSearch;
    });
  }, [sortedAllObjectSettingsDetailItems, searchTerm, showInactive]);

  const { refreshCoreViewsByObjectMetadataId } =
    useRefreshCoreViewsByObjectMetadataId();
  const { refreshObjectMetadataItems } =
    useRefreshObjectMetadataItems('network-only');
  const [updateOneFieldMetadataItemMutation] =
    useUpdateOneFieldMetadataItemMutation();

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination || !settingsObjectFields) {
        return;
      }

      const sourceIndex = result.source.index;
      const destinationIndex = result.destination.index;

      if (sourceIndex === destinationIndex) {
        return;
      }

      // 1. Get current visible list IDs
      const currentFilteredFieldIds = filteredItems.map(
        (item) => item.fieldMetadataItem.id,
      );

      // 2. Reorder visible IDs
      const reorderedFilteredIds = moveArrayItem(currentFilteredFieldIds, {
        fromIndex: sourceIndex,
        toIndex: destinationIndex,
      });

      // 3. Get non-visual/hidden fields (to keep them in state)
      const nonSystemFields = settingsObjectFields.filter(
        (field) => !field.isSystem,
      );
      const filteredIdsSet = new Set(reorderedFilteredIds);
      const hiddenFields = nonSystemFields.filter(
        (field) => !filteredIdsSet.has(field.id),
      );

      // 4. Construct new state: Visible fields (reordered) + Hidden fields
      // Important: We assign new positions sequentially to visible fields matching the visual order
      const fieldsToUpdate: ObjectMetadataItem['fields'] = [];

      const reorderedVisibleFields = reorderedFilteredIds
        .map((id, index) => {
          const field = nonSystemFields.find((f) => f.id === id);
          if (!field) return null;

          const updatedField = {
            ...field,
            settings: {
              ...field.settings,
              position: index, // Assign clean sequential index
            },
          };

          // Only add to update list if position actually changed
          if (field.settings?.position !== index) {
            fieldsToUpdate.push(updatedField);
          }

          return updatedField;
        })
        .filter(isDefined);

      const allNonSystemFields = [...reorderedVisibleFields, ...hiddenFields];

      // 5. Optimistic Update
      const systemFields = settingsObjectFields.filter(
        (field) => field.isSystem,
      );
      setSettingsObjectFields([...allNonSystemFields, ...systemFields]);

      // 6. Batch Server Update (Parallel mutations)
      try {
        await Promise.all(
          fieldsToUpdate.map((field) =>
            updateOneFieldMetadataItemMutation({
              variables: {
                idToUpdate: field.id,
                updatePayload: {
                  settings: field.settings,
                },
              },
            }),
          ),
        );

        // 7. Single Refresh after all updates
        await Promise.all([
          refreshObjectMetadataItems(),
          refreshCoreViewsByObjectMetadataId(objectMetadataItem.id),
        ]);
      } catch (error) {
        // Revert on error
        setSettingsObjectFields(settingsObjectFields);
        console.error('Failed to update field positions', error);
      }
    },
    [
      filteredItems,
      settingsObjectFields,
      objectMetadataItem.id,
      setSettingsObjectFields,
      updateOneFieldMetadataItemMutation,
      refreshObjectMetadataItems,
      refreshCoreViewsByObjectMetadataId,
    ],
  );

  return (
    <>
      <StyledSearchAndFilterContainer>
        <StyledSearchInput
          instanceId="object-field-table-search"
          LeftIcon={IconSearch}
          placeholder={t`Search a field...`}
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <Dropdown
          dropdownId="settings-fields-filter-dropdown"
          dropdownPlacement="bottom-end"
          dropdownOffset={{ x: 0, y: 8 }}
          clickableComponent={
            <Button
              Icon={IconFilter}
              size="medium"
              variant="secondary"
              accent="default"
              ariaLabel={t`Filter`}
            />
          }
          dropdownComponents={
            <DropdownContent>
              <DropdownMenuItemsContainer>
                <MenuItemToggle
                  LeftIcon={IconArchive}
                  onToggleChange={() => setShowInactive(!showInactive)}
                  toggled={showInactive}
                  text={t`Inactive`}
                  toggleSize="small"
                />
              </DropdownMenuItemsContainer>
            </DropdownContent>
          }
        />
      </StyledSearchAndFilterContainer>
      <Table>
        <StyledObjectFieldTableRow>
          {tableMetadata.fields.map((item) => (
            <SortableTableHeader
              key={item.fieldName}
              fieldName={item.fieldName}
              label={t(item.fieldLabel)}
              tableId={tableMetadata.tableId}
              initialSort={tableMetadata.initialSort}
            />
          ))}
          <TableHeader></TableHeader>
        </StyledObjectFieldTableRow>
        <DraggableList
          onDragEnd={!searchTerm ? handleDragEnd : undefined}
          draggableItems={
            <>
              {filteredItems.map((objectSettingsDetailItem, index) => {
                const status = objectSettingsDetailItem.fieldMetadataItem.isActive
                  ? 'active'
                  : 'disabled';

                return (
                  <DraggableItem
                    draggableId={objectSettingsDetailItem.fieldMetadataItem.id}
                    index={index}
                    isDragDisabled={!!searchTerm}
                    itemComponent={
                      <SettingsObjectFieldItemTableRow
                        key={objectSettingsDetailItem.fieldMetadataItem.id}
                        settingsObjectDetailTableItem={objectSettingsDetailItem}
                        status={status}
                        mode={mode}
                      />
                    }
                  />
                );
              })}
            </>
          }
        />
      </Table>
    </>
  );
};

# Audit of the v12 female content

Completed before importing NIH 3D replacements. The dataset is unchanged between v12 and v13.

## Findings

- **264 source meshes and 11 study groups (275 selectable entries).** All seven input GLBs match the SHA-256 checksums recorded in v12.
- Input files were Anatria3D's pinned `*_female.glb` adaptations, revision `7e2c5cb866196d247c494539f443d759485ba69a`. Its notice attributes them to HRA `ref-organ/united-female v1.5`, ultimately Visible Human Female / U.S. National Library of Medicine.
- **No male Z-Anatomy geometry was deformed, morphed or relabelled as female by Forma.** The importer reads only the seven female GLBs. It reads the male JSON to reuse some instructional text, not to obtain or reshape geometry. It applies one uniform scale and translation to the separate female scene, bakes existing source transforms, changes materials and re-encodes Draco. It does not perform sex-shape conversion.
- The intermediate exporter reports selected original HRA nodes, baked transforms, removed materials/UVs and Draco quantisation. Forma's earlier tests compared source names, bounds, triangle counts and expected degenerate-triangle removal. This proves the application's import path, not independent clinical validation of every upstream surface.
- The recorded geometry licence was **CC BY 4.0**, from the intermediate asset notice and HRA united-female metadata. **V12 did not verify a separate NIH 3D model-page licence/ID for each mesh.** That provenance gap must not be presented as a completed per-model NIH audit.
- No mesh meets the requested removal condition of being produced by deforming the male model. The replacement pass will nevertheless use individually checked NIH records and retire misleading whole-body female wording.

## Sources and transformations

- [Pinned intermediary source](https://github.com/Nurkan1/Anatria-3D/tree/7e2c5cb866196d247c494539f443d759485ba69a/public/anatomy)
- [HRA original digital object metadata](https://cdn.humanatlas.io/digital-objects/ref-organ/united-female/v1.5/metadata.json)
- [NLM Visible Human Project](https://www.nlm.nih.gov/research/visible/visible_human.html)
- [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

Forma's uniform scale was `3.198060699092017`; translation `[0, -1.0729493645453718, 0.14870982250777878]`. These are display-unit/centering transforms applied equally to the separate female source set, not anatomical reshaping or alignment to the male body.

`v12-inventory.json` records every original node name, exact input URL and declared licence per selectable entry. Original notices and checksums are preserved in `public/credits/hra-upstream-notice.txt`, `public/credits/hra-upstream-license.txt` and `docs/female-audit/v12-model-info.json`.

## Complete structure list

### Cardiovascular (60 entries)

| Structure | Type | Original mesh / file | Licence |
| --- | --- | --- | --- |
| Uterine artery (left) | mesh | VH_F_left_uterine_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Uterine artery (right) | mesh | VH_F_right_uterine_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Uterine veins (left) | mesh | VH_F_left_uterine_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Uterine veins (right) | mesh | VH_F_right_uterine_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Right renal artery | mesh | VH_F_right_renal_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Left renal artery | mesh | VH_F_left_renal_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Left renal vein | mesh | VH_F_left_renal_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Right renal vein | mesh | VH_F_right_renal_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Superior mesenteric vein | mesh | VH_F_superior_mesenteric_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Superior anorectal vein | mesh | VH_F_superior_rectal_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Common iliac vein (left) | mesh | VH_F_left_common_iliac_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Common iliac vein (right) | mesh | VH_F_right_common_iliac_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Left colic vein | mesh | VH_F_left_colic_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Right colic vein | mesh | VH_F_right_colic_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Ileocolic vein | mesh | VH_F_ileocolic_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Middle colic vein | mesh | VH_F_middle_colic_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Inferior anorectal veins (left) | mesh | VH_F_inferior_rectal_vein_L — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Inferior anorectal veins (right) | mesh | VH_F_inferior_rectal_vein_R — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Internal iliac vein (left) | mesh | VH_F_internal_iliac_vein_L — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Internal iliac vein (right) | mesh | VH_F_internal_iliac_vein_R — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Internal pudendal vein (left) | mesh | VH_F_internal_pudendal_vein_L — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Internal pudendal vein (right) | mesh | VH_F_internal_pudendal_vein_R — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Middle anorectal veins (left) | mesh | VH_F_middle_rectal_vein_L — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Middle anorectal veins (right) | mesh | VH_F_middle_rectal_vein_R — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Sigmoid veins, 1 | mesh | VH_F_sigmoid_vein_a — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Sigmoid veins, 3 | mesh | VH_F_sigmoid_vein_c — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Median sacral vein | mesh | VH_F_median_sacral_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Sigmoid veins, 2 | mesh | VH_F_sigmoid_vein_b — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Inferior mesenteric vein | mesh | VH_F_inferior_mesenteric_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Left colic artery | mesh | VH_F_left_colic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Right colic artery | mesh | VH_F_right_colic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Ileocolic artery | mesh | VH_F_ileocolic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Middle colic artery | mesh | VH_F_middle_colic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Coeliac trunk | mesh | VH_F_celiac_trunk — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Superior anorectal artery | mesh | VH_F_superior_rectal_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Superior mesenteric artery | mesh | VH_F_superior_mesenteric_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Inferior mesenteric artery | mesh | VH_F_inferior_mesenteric_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Marginal artery | mesh | VH_F_marginal_artery_of_Drummond — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Sigmoid arteries, 3 | mesh | VH_F_sigmoid_artery_c — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Sigmoid arteries, 2 | mesh | VH_F_sigmoid_artery_b — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Sigmoid arteries, 1 | mesh | VH_F_sigmoid_artery_a — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Splenic artery | mesh | VH_F_splenic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Splenic vein | mesh | VH_F_splenic_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Cystic artery | mesh | VH_F_cystic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Cystic veins | mesh | VH_F_cystic_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Intermediate branch of left hepatic artery | mesh | VH_F_middle_hepatic_artery_branch_of_left_hepatic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Proper hepatic artery | mesh | VH_F_proper_hepatic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Right hepatic artery | mesh | VH_F_right_hepatic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Common hepatic artery | mesh | VH_F_common_hepatic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Left hepatic artery | mesh | VH_F_left_hepatic_artery — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Hepatic portal vein | mesh | VH_F_hepatic_portal_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Intermediate hepatic vein | mesh | VH_F_middle_hepatic_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Left hepatic vein | mesh | VH_F_left_hepatic_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Right hepatic vein | mesh | VH_F_right_hepatic_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Right branch of hepatic portal vein | mesh | VH_F_right_branch_of_portal_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Left branch of hepatic portal vein | mesh | VH_F_left_branch_of_portal_vein — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Inferior vena cava, upper | mesh | VH_F_inferior_vena_cava_a — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Inferior vena cava, lower | mesh | VH_F_inferior_vena_cava_b — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Descending aorta, upper | mesh | VH_F_descending_aorta_a — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |
| Descending aorta, lower | mesh | VH_F_descending_aorta_b — cardiovascular_female.glb | CC BY 4.0 (declared input licence) |

### Digestive (52 entries)

| Structure | Type | Original mesh / file | Licence |
| --- | --- | --- | --- |
| Right colic flexure | mesh | VH_F_hepatic_flexure_of_colon — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Transverse colon | mesh | VH_F_transverse_colon — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Ascending colon | mesh | VH_F_ascending_colon — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Vermiform appendix | mesh | VH_F_vermiform_appendix — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Descending colon | mesh | VH_F_descending_colon — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Ileal papilla | mesh | VH_F_ileocecal_valve — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Caecum | mesh | VH_F_caecum — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Rectum | mesh | VH_F_rectum — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Sigmoid colon | mesh | VH_F_sigmoid_colon — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Left colic flexure | mesh | VH_F_splenic_flexure_of_colon — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Superior part of duodenum | mesh | VH_F_duodenum_superior — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Descending part of duodenum | mesh | VH_F_duodenum_descending — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Sphincter of ampulla | mesh | VH_F_sphincter_of_heptopancreatic_ampulla — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Ascending part of duodenum | mesh | VH_F_duodenum_ascending — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Horizontal part of duodenum | mesh | VH_F_duodenum_horizontal — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Jejunum | mesh | VH_F_jejenum — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Ileum | mesh | VH_F_ileum — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Terminal ileum | mesh | VH_F_ileum_terminal — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Right hepatic duct | mesh | VH_F_right_hepatic_duct — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Left hepatic duct | mesh | VH_F_left_hepatic_duct — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Common hepatic duct | mesh | VH_F_common_hepatic_duct — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Hepatopancreatic ampulla | mesh | VH_F_hepatopancreatic_ampulla — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Accessory pancreatic duct | mesh | VH_F_dorsal_pancreatic_duct — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Bile duct | mesh | VH_F_common_bile_duct — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Pancreatic duct | mesh | VH_F_ventral_pancreatic_duct — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Cystic duct | mesh | VH_F_cystic_duct — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Gastric impression of liver | mesh | VH_F_gastric_impression_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Suprarenal impression of liver | mesh | VH_F_suprarenal_impression_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Renal impression of liver | mesh | VH_F_renal_impression_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Duodenal impression of liver | mesh | VH_F_duodenal_impression_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Oesophageal impression of liver | mesh | VH_F_esophageal_impression_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Porta hepatis | mesh | VH_F_porta_hepatis — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Colic impression of liver | mesh | VH_F_colic_impression_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Fibrous capsule of liver | mesh | VH_F_capsule_of_the_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Bare area of liver | mesh | VH_F_bare_area_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Diaphragmatic surface of liver | mesh | VH_F_diaphragmatic_surface_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Quadrate lobe | mesh | VH_F_quadrate_lobe — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Caudate lobe | mesh | VH_F_caudate_lobe — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Coronary ligament | mesh | VH_F_coronary_ligament_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Falciform ligament | mesh | VH_F_falciform_ligament — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Left triangular ligament | mesh | VH_F_triangular_ligament_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Ligamentum venosum | mesh | VH_F_ligamentum_venosum — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Round ligament of liver | mesh | VH_F_round_ligament_of_liver — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Hepatoduodenal ligament | mesh | VH_F_hepataduodenal_ligament — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Tail of pancreas | mesh | VH_F_tail_of_pancreas — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Body of pancreas | mesh | VH_F_body_of_pancreas — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Uncinate process of pancreas | mesh | VH_F_ucinate_process1 — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Head of pancreas | mesh | VH_F_head_of_pancreas — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Neck of pancreas | mesh | VH_F_neck_of_pancreas — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Gallbladder | mesh | VH_F_gallbladder — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Pancreas | group | VH_F_dorsal_pancreatic_duct — digestive_female.glb<br>VH_F_ventral_pancreatic_duct — digestive_female.glb<br>VH_F_tail_of_pancreas — digestive_female.glb<br>VH_F_body_of_pancreas — digestive_female.glb<br>VH_F_ucinate_process1 — digestive_female.glb<br>VH_F_head_of_pancreas — digestive_female.glb<br>VH_F_neck_of_pancreas — digestive_female.glb | CC BY 4.0 (declared input licence) |
| Liver | group | VH_F_gastric_impression_of_liver — digestive_female.glb<br>VH_F_suprarenal_impression_of_liver — digestive_female.glb<br>VH_F_renal_impression_of_liver — digestive_female.glb<br>VH_F_duodenal_impression_of_liver — digestive_female.glb<br>VH_F_esophageal_impression_of_liver — digestive_female.glb<br>VH_F_porta_hepatis — digestive_female.glb<br>VH_F_colic_impression_of_liver — digestive_female.glb<br>VH_F_capsule_of_the_liver — digestive_female.glb<br>VH_F_bare_area_of_liver — digestive_female.glb<br>VH_F_diaphragmatic_surface_of_liver — digestive_female.glb<br>VH_F_quadrate_lobe — digestive_female.glb<br>VH_F_caudate_lobe — digestive_female.glb<br>VH_F_coronary_ligament_of_liver — digestive_female.glb<br>VH_F_falciform_ligament — digestive_female.glb<br>VH_F_triangular_ligament_of_liver — digestive_female.glb<br>VH_F_ligamentum_venosum — digestive_female.glb<br>VH_F_round_ligament_of_liver — digestive_female.glb<br>VH_F_hepataduodenal_ligament — digestive_female.glb | CC BY 4.0 (declared input licence) |

### Integumentary (18 entries)

| Structure | Type | Original mesh / file | Licence |
| --- | --- | --- | --- |
| Body of breast (left) | mesh | VH_F_fat_L — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Areolar tubercles (left) | mesh | VH_F_areolar_tubercles_L — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Nipple (left) | mesh | VH_F_nipple_L — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Areola (left) | mesh | VH_F_areola_L — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Lobes of mammary gland (left) | mesh | VH_F_mammary_lobes_L — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Lactiferous ducts (left) | mesh | VH_F_main_lactiferous_ducts_L — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Lactiferous sinuses (left) | mesh | VH_F_main_lactiferous_sinuses_L — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Suspensory ligaments of breast (left) | mesh | VH_F_suspensory_ligaments_L — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Body of breast (right) | mesh | VH_F_fat_R — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Areolar tubercles (right) | mesh | VH_F_areolar_tubercles_R — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Nipple (right) | mesh | VH_F_nipple_R — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Areola (right) | mesh | VH_F_areola_R — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Lactiferous sinuses (right) | mesh | VH_F_main_lactiferous_sinuses_R — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Lactiferous ducts (right) | mesh | VH_F_main_lactiferous_ducts_R — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Lobes of mammary gland (right) | mesh | VH_F_mammary_lobes_R — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Suspensory ligaments of breast (right) | mesh | VH_F_suspensory_ligaments_R — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Left breast | group | VH_F_fat_L — integumentary_female.glb<br>VH_F_areolar_tubercles_L — integumentary_female.glb<br>VH_F_nipple_L — integumentary_female.glb<br>VH_F_areola_L — integumentary_female.glb<br>VH_F_mammary_lobes_L — integumentary_female.glb<br>VH_F_main_lactiferous_ducts_L — integumentary_female.glb<br>VH_F_main_lactiferous_sinuses_L — integumentary_female.glb<br>VH_F_suspensory_ligaments_L — integumentary_female.glb | CC BY 4.0 (declared input licence) |
| Right breast | group | VH_F_fat_R — integumentary_female.glb<br>VH_F_areolar_tubercles_R — integumentary_female.glb<br>VH_F_nipple_R — integumentary_female.glb<br>VH_F_areola_R — integumentary_female.glb<br>VH_F_main_lactiferous_sinuses_R — integumentary_female.glb<br>VH_F_main_lactiferous_ducts_R — integumentary_female.glb<br>VH_F_mammary_lobes_R — integumentary_female.glb<br>VH_F_suspensory_ligaments_R — integumentary_female.glb | CC BY 4.0 (declared input licence) |

### Lymphatic (6 entries)

| Structure | Type | Original mesh / file | Licence |
| --- | --- | --- | --- |
| Gastric impression of spleen | mesh | VH_F_gastric_surface_of_spleen — lymphatic_female.glb | CC BY 4.0 (declared input licence) |
| Diaphragmatic surface of spleen | mesh | VH_F_diaphragmatic_surface_of_spleen — lymphatic_female.glb | CC BY 4.0 (declared input licence) |
| Colic impression of spleen | mesh | VH_F_colic_surface_of_spleen — lymphatic_female.glb | CC BY 4.0 (declared input licence) |
| Hilum of spleen | mesh | VH_F_hilum_of_spleen — lymphatic_female.glb | CC BY 4.0 (declared input licence) |
| Renal impression of spleen | mesh | VH_F_renal_surface_of_spleen — lymphatic_female.glb | CC BY 4.0 (declared input licence) |
| Spleen | group | VH_F_gastric_surface_of_spleen — lymphatic_female.glb<br>VH_F_diaphragmatic_surface_of_spleen — lymphatic_female.glb<br>VH_F_colic_surface_of_spleen — lymphatic_female.glb<br>VH_F_hilum_of_spleen — lymphatic_female.glb<br>VH_F_renal_surface_of_spleen — lymphatic_female.glb | CC BY 4.0 (declared input licence) |

### Reproductive (39 entries)

| Structure | Type | Original mesh / file | Licence |
| --- | --- | --- | --- |
| Vagina | mesh | VH_F_vagina — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Ampulla of uterine tube (right) | mesh | VH_F_ampulla_of_uterine_tube_R — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Isthmus of uterine tube (right) | mesh | VH_F_isthmus_of_fallopian_tube_R — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Fimbriae of uterine tube (right) | mesh | VH_F_fibria_of_uterine_tube_R — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Infundibulum of uterine tube (right) | mesh | VH_F_uterine_tube_infundibulum_R — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Infundibulum of uterine tube (left) | mesh | VH_F_uterine_tube_infundibulum_L — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Fimbriae of uterine tube (left) | mesh | VH_F_fibria_of_uterine_tube_L — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Isthmus of uterine tube (left) | mesh | VH_F_isthmus_of_fallopian_tube_L — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Ampulla of uterine tube (left) | mesh | VH_F_ampulla_of_uterine_tube_L — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Vesico-uterine pouch | mesh | VH_F_uterovesical_pouch — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Round ligament of uterus (right) | mesh | VH_F_right_round_ligament_of_uterus — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Round ligament of uterus (left) | mesh | VH_F_left_round_ligament_of_uterus — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Uterosacral ligament (right) | mesh | VH_F_right_uterosacral_ligament — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Uterosacral ligament (left) | mesh | VH_F_left_uterosacral_ligament — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Cardinal ligament (right) | mesh | VH_F_right_cardinal_ligament_of_uterus — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Cardinal ligament (left) | mesh | VH_F_left_cardinal_ligament_of_uterus — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Suspensory ligament of ovary (right) | mesh | VH_F_suspensory_ligament_of_ovary_R — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Suspensory ligament of ovary (left) | mesh | VH_F_suspensory_ligament_of_ovary_L — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Proper ovarian ligament (left) | mesh | VH_F_ovarian_ligament_L — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Proper ovarian ligament (right) | mesh | VH_F_ovarian_ligament_R — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Broad ligament of uterus | mesh | VH_F_broad_ligament — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Mesosalpinx (left) | mesh | VH_F_mesosalpinx_L — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Mesosalpinx (right) | mesh | VH_F_mesosalpinx_R — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Mesovarium (right) | mesh | VH_F_mesovarium_R — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Mesovarium (left) | mesh | VH_F_mesovarium_L — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Ovary (left) | mesh | VH_F_left_ovary — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Ovary (right) | mesh | VH_F_right_ovary — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Abdominal ostium of uterine tube | mesh | VH_F_abdominal_ostium_of_uterine_tube — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Body of uterus | mesh | VH_F_body_of_uterus — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Fundus of uterus | mesh | VH_F_fundus_of_uterus — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Isthmus of uterus | mesh | VH_F_lower_uterine_segment — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Posterior surface of uterus | mesh | VH_F_posterior_wall_of_uterus — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Anterior surface of uterus | mesh | VH_F_anterior_wall_of_uterus — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Cervix of uterus | mesh | VH_F_cervix — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Internal os of uterus | mesh | VH_F_internal_cervical_os — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| External os of uterus | mesh | VH_F_external_cervical_os — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Right uterine tube | group | VH_F_ampulla_of_uterine_tube_R — reproductive_female.glb<br>VH_F_isthmus_of_fallopian_tube_R — reproductive_female.glb<br>VH_F_fibria_of_uterine_tube_R — reproductive_female.glb<br>VH_F_uterine_tube_infundibulum_R — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Left uterine tube | group | VH_F_uterine_tube_infundibulum_L — reproductive_female.glb<br>VH_F_fibria_of_uterine_tube_L — reproductive_female.glb<br>VH_F_isthmus_of_fallopian_tube_L — reproductive_female.glb<br>VH_F_ampulla_of_uterine_tube_L — reproductive_female.glb | CC BY 4.0 (declared input licence) |
| Uterus | group | VH_F_body_of_uterus — reproductive_female.glb<br>VH_F_fundus_of_uterus — reproductive_female.glb<br>VH_F_lower_uterine_segment — reproductive_female.glb<br>VH_F_posterior_wall_of_uterus — reproductive_female.glb<br>VH_F_anterior_wall_of_uterus — reproductive_female.glb<br>VH_F_cervix — reproductive_female.glb<br>VH_F_internal_cervical_os — reproductive_female.glb<br>VH_F_external_cervical_os — reproductive_female.glb | CC BY 4.0 (declared input licence) |

### Skeletal (39 entries)

| Structure | Type | Original mesh / file | Licence |
| --- | --- | --- | --- |
| Sacrum | mesh | VH_F_sacrum — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Coccyx | mesh | VH_F_coccyx — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Pubis, spongy bone (left) | mesh | VH_F_pubis_spongy_bone_L — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Pubis, spongy bone (right) | mesh | VH_F_pubis_spongy_bone_R — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Pubis, compact bone (right) | mesh | VH_F_pubis_compact_bone_R — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Pubis, compact bone (left) | mesh | VH_F_pubis_compact_bone_L — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Ilium, compact bone (right) | mesh | VH_F_ilium_compact_bone_R — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Ilium, compact bone (left) | mesh | VH_F_ilium_compact_bone_L — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Ilium, spongy bone (left) | mesh | VH_F_ilium_spongy_bone_L — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Ilium, spongy bone (right) | mesh | VH_F_ilium_spongy_bone_R — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Ischium, compact bone (right) | mesh | VH_F_ischium_compact_bone_R — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Ischium, compact bone (left) | mesh | VH_F_ischium_compact_bone_L — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Ischium, spongy bone (right) | mesh | VH_F_ischium_spongy_bone_R — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Ischium, spongy bone (left) | mesh | VH_F_ischium_spongy_bone_L — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra L1 | mesh | VH_F_lumbar_vertebra_1 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra L2 | mesh | VH_F_lumbar_vertebra_2 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra L3 | mesh | VH_F_lumbar_vertebra_3 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra L4 | mesh | VH_F_lumbar_vertebra_4 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra L5 | mesh | VH_F_lumbar_vertebra_5 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Lumbar vertebra, L6 | mesh | VH_F_lumbar_vertebra_6 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T1 | mesh | VH_F_thoracic_vertebra_1 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T2 | mesh | VH_F_thoracic_vertebra_2 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T3 | mesh | VH_F_thoracic_vertebra_3 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T4 | mesh | VH_F_thoracic_vertebra_4 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T5 | mesh | VH_F_thoracic_vertebra_5 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T6 | mesh | VH_F_thoracic_vertebra_6 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T7 | mesh | VH_F_thoracic_vertebra_7 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T8 | mesh | VH_F_thoracic_vertebra_8 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T9 | mesh | VH_F_thoracic_vertebra_9 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T10 | mesh | VH_F_thoracic_vertebra_10 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T11 | mesh | VH_F_thoracic_vertebra_11 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra T12 | mesh | VH_F_thoracic_vertebra_12 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Atlas (C1) | mesh | VH_F_cervical_vertebra_1 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Axis (C2) | mesh | VH_F_cervical_vertebra_2 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra C3 | mesh | VH_F_cervical_vertebra_3 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra C4 | mesh | VH_F_cervical_vertebra_4 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra C5 | mesh | VH_F_cervical_vertebra_5 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra C6 | mesh | VH_F_cervical_vertebra_6 — skeletal_female.glb | CC BY 4.0 (declared input licence) |
| Vertebra C7 | mesh | VH_F_cervical_vertebra_7 — skeletal_female.glb | CC BY 4.0 (declared input licence) |

### Urinary (61 entries)

| Structure | Type | Original mesh / file | Licence |
| --- | --- | --- | --- |
| Fibrous capsule of kidney (left) | mesh | VH_F_kidney_capsule_L — renal_female.glb | CC BY 4.0 (declared input licence) |
| Hilum of kidney (left) | mesh | VH_F_hilum_of_kidney_L — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 1 (left) | mesh | VH_F_renal_papilla_L_a — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 2 (left) | mesh | VH_F_renal_papilla_L_b — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 3 (left) | mesh | VH_F_renal_papilla_L_c — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 4 (left) | mesh | VH_F_renal_papilla_L_d — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 5 (left) | mesh | VH_F_renal_papilla_L_e — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 6 (left) | mesh | VH_F_renal_papilla_L_f — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 7 (left) | mesh | VH_F_renal_papilla_L_g — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 8 (left) | mesh | VH_F_renal_papilla_L_h — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 9 (left) | mesh | VH_F_renal_papilla_L_i — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 10 (left) | mesh | VH_F_renal_papilla_L_j — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 11 (left) | mesh | VH_F_renal_papilla_L_k — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 1 (left) | mesh | VH_F_renal_pyramid_L_a — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 2 (left) | mesh | VH_F_renal_pyramid_L_b — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 3 (left) | mesh | VH_F_renal_pyramid_L_c — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 4 (left) | mesh | VH_F_renal_pyramid_L_d — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 5 (left) | mesh | VH_F_renal_pyramid_L_e — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 6 (left) | mesh | VH_F_renal_pyramid_L_f — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 7 (left) | mesh | VH_F_renal_pyramid_L_g — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 8 (left) | mesh | VH_F_renal_pyramid_L_h — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 9 (left) | mesh | VH_F_renal_pyramid_L_i — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 10 (left) | mesh | VH_F_renal_pyramid_L_j — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 11 (left) | mesh | VH_F_renal_pyramid_L_k — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal columns (left) | mesh | VH_F_renal_column_L — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal cortex (left) | mesh | VH_F_outer_cortex_of_kidney_L — renal_female.glb | CC BY 4.0 (declared input licence) |
| Fibrous capsule of kidney (right) | mesh | VH_F_kidney_capsule_R — renal_female.glb | CC BY 4.0 (declared input licence) |
| Hilum of kidney (right) | mesh | VH_F_hilum_of_kidney_R — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal cortex (right) | mesh | VH_F_outer_cortex_of_kidney_R — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal columns (right) | mesh | VH_F_renal_column_R — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 1 (right) | mesh | VH_F_renal_papilla_R_a — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 2 (right) | mesh | VH_F_renal_papilla_R_b — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 3 (right) | mesh | VH_F_renal_papilla_R_c — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 4 (right) | mesh | VH_F_renal_papilla_R_d — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 5 (right) | mesh | VH_F_renal_papilla_R_e — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 6 (right) | mesh | VH_F_renal_papilla_R_f — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 7 (right) | mesh | VH_F_renal_papilla_R_g — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 8 (right) | mesh | VH_F_renal_papilla_R_h — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 9 (right) | mesh | VH_F_renal_papilla_R_i — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal papilla, 10 (right) | mesh | VH_F_renal_papilla_R_j — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 1 (right) | mesh | VH_F_renal_pyramid_R_a — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 2 (right) | mesh | VH_F_renal_pyramid_R_b — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 3 (right) | mesh | VH_F_renal_pyramid_R_c — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 4 (right) | mesh | VH_F_renal_pyramid_R_d — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 5 (right) | mesh | VH_F_renal_pyramid_R_e — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 6 (right) | mesh | VH_F_renal_pyramid_R_f — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 7 (right) | mesh | VH_F_renal_pyramid_R_g — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 8 (right) | mesh | VH_F_renal_pyramid_R_h — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 9 (right) | mesh | VH_F_renal_pyramid_R_i — renal_female.glb | CC BY 4.0 (declared input licence) |
| Renal pyramid, 10 (right) | mesh | VH_F_renal_pyramid_R_j — renal_female.glb | CC BY 4.0 (declared input licence) |
| Ureter (right) | mesh | VH_F_right_ureter — renal_female.glb | CC BY 4.0 (declared input licence) |
| Ureter (left) | mesh | VH_F_left_ureter — renal_female.glb | CC BY 4.0 (declared input licence) |
| Fundus of bladder, dome | mesh | VH_F_fundus_of_urinary_bladder_dome — renal_female.glb | CC BY 4.0 (declared input licence) |
| Neck of bladder | mesh | VH_F_urinary_bladder_neck_smooth_muscle — renal_female.glb | CC BY 4.0 (declared input licence) |
| Fundus of bladder, base | mesh | VH_F_fundus_of_urinary_bladder_base — renal_female.glb | CC BY 4.0 (declared input licence) |
| Trigone of bladder | mesh | VH_F_trigone_of_urinary_bladder — renal_female.glb | CC BY 4.0 (declared input licence) |
| Ureteric orifice (right) | mesh | VH_F_ureteral_orifice_R — renal_female.glb | CC BY 4.0 (declared input licence) |
| Ureteric orifice (left) | mesh | VH_F_ureteral_orifice_L — renal_female.glb | CC BY 4.0 (declared input licence) |
| Left kidney | group | VH_F_kidney_capsule_L — renal_female.glb<br>VH_F_hilum_of_kidney_L — renal_female.glb<br>VH_F_renal_papilla_L_a — renal_female.glb<br>VH_F_renal_papilla_L_b — renal_female.glb<br>VH_F_renal_papilla_L_c — renal_female.glb<br>VH_F_renal_papilla_L_d — renal_female.glb<br>VH_F_renal_papilla_L_e — renal_female.glb<br>VH_F_renal_papilla_L_f — renal_female.glb<br>VH_F_renal_papilla_L_g — renal_female.glb<br>VH_F_renal_papilla_L_h — renal_female.glb<br>VH_F_renal_papilla_L_i — renal_female.glb<br>VH_F_renal_papilla_L_j — renal_female.glb<br>VH_F_renal_papilla_L_k — renal_female.glb<br>VH_F_renal_pyramid_L_a — renal_female.glb<br>VH_F_renal_pyramid_L_b — renal_female.glb<br>VH_F_renal_pyramid_L_c — renal_female.glb<br>VH_F_renal_pyramid_L_d — renal_female.glb<br>VH_F_renal_pyramid_L_e — renal_female.glb<br>VH_F_renal_pyramid_L_f — renal_female.glb<br>VH_F_renal_pyramid_L_g — renal_female.glb<br>VH_F_renal_pyramid_L_h — renal_female.glb<br>VH_F_renal_pyramid_L_i — renal_female.glb<br>VH_F_renal_pyramid_L_j — renal_female.glb<br>VH_F_renal_pyramid_L_k — renal_female.glb<br>VH_F_renal_column_L — renal_female.glb<br>VH_F_outer_cortex_of_kidney_L — renal_female.glb | CC BY 4.0 (declared input licence) |
| Right kidney | group | VH_F_kidney_capsule_R — renal_female.glb<br>VH_F_hilum_of_kidney_R — renal_female.glb<br>VH_F_outer_cortex_of_kidney_R — renal_female.glb<br>VH_F_renal_column_R — renal_female.glb<br>VH_F_renal_papilla_R_a — renal_female.glb<br>VH_F_renal_papilla_R_b — renal_female.glb<br>VH_F_renal_papilla_R_c — renal_female.glb<br>VH_F_renal_papilla_R_d — renal_female.glb<br>VH_F_renal_papilla_R_e — renal_female.glb<br>VH_F_renal_papilla_R_f — renal_female.glb<br>VH_F_renal_papilla_R_g — renal_female.glb<br>VH_F_renal_papilla_R_h — renal_female.glb<br>VH_F_renal_papilla_R_i — renal_female.glb<br>VH_F_renal_papilla_R_j — renal_female.glb<br>VH_F_renal_pyramid_R_a — renal_female.glb<br>VH_F_renal_pyramid_R_b — renal_female.glb<br>VH_F_renal_pyramid_R_c — renal_female.glb<br>VH_F_renal_pyramid_R_d — renal_female.glb<br>VH_F_renal_pyramid_R_e — renal_female.glb<br>VH_F_renal_pyramid_R_f — renal_female.glb<br>VH_F_renal_pyramid_R_g — renal_female.glb<br>VH_F_renal_pyramid_R_h — renal_female.glb<br>VH_F_renal_pyramid_R_i — renal_female.glb<br>VH_F_renal_pyramid_R_j — renal_female.glb | CC BY 4.0 (declared input licence) |
| Urinary bladder | group | VH_F_fundus_of_urinary_bladder_dome — renal_female.glb<br>VH_F_urinary_bladder_neck_smooth_muscle — renal_female.glb<br>VH_F_fundus_of_urinary_bladder_base — renal_female.glb<br>VH_F_trigone_of_urinary_bladder — renal_female.glb<br>VH_F_ureteral_orifice_R — renal_female.glb<br>VH_F_ureteral_orifice_L — renal_female.glb | CC BY 4.0 (declared input licence) |
